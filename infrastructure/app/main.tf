data "aws_caller_identity" "current" {}

data "aws_vpc" "default" {
  count   = var.vpc_id == null ? 1 : 0
  default = true
}

data "aws_subnets" "default_vpc" {
  count = length(var.subnet_ids) == 0 ? 1 : 0

  filter {
    name   = "vpc-id"
    values = [var.vpc_id != null ? var.vpc_id : data.aws_vpc.default[0].id]
  }
}

data "tls_certificate" "vercel_oidc" {
  url = "https://oidc.vercel.com/${var.vercel_team_slug}"
}

locals {
  account_id = data.aws_caller_identity.current.account_id

  is_prod = var.env == "prod"

  effective_vpc_id = var.vpc_id != null ? var.vpc_id : data.aws_vpc.default[0].id

  effective_subnet_ids = length(var.subnet_ids) > 0 ? var.subnet_ids : data.aws_subnets.default_vpc[0].ids

  effective_artifacts_bucket_name = coalesce(
    var.artifacts_bucket_name,
    "${var.project_name}-artifacts-${var.env}-${local.account_id}-${var.aws_region}"
  )

  cors_allowed_origins = distinct(compact(concat(
    var.allowed_localhost_origins,
    var.allowed_vercel_preview_origins,
    var.allowed_vercel_prod_origins
  )))

  backup_retention_days = local.is_prod ? var.db_backup_retention_days_prod : var.db_backup_retention_days_dev

  vercel_audience = "https://vercel.com/${var.vercel_team_slug}"

  vercel_subjects = length(var.vercel_oidc_subjects) > 0 ? var.vercel_oidc_subjects : [
    "owner:${var.vercel_team_slug}:project:${var.vercel_project_name}:environment:*"
  ]
}

resource "aws_s3_bucket" "artifacts" {
  bucket = local.effective_artifacts_bucket_name

  tags = {
    Project = var.project_name
    Env     = var.env
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = local.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnets-${var.env}"
  subnet_ids = local.effective_subnet_ids

  tags = {
    Name    = "${var.project_name}-db-subnets-${var.env}"
    Project = var.project_name
    Env     = var.env
  }
}

resource "aws_security_group" "db" {
  name        = "${var.project_name}-db-${var.env}"
  description = "PostgreSQL ingress from RDS Proxy"
  vpc_id      = local.effective_vpc_id

  ingress {
    from_port       = var.db_port
    to_port         = var.db_port
    protocol        = "tcp"
    security_groups = [aws_security_group.proxy.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-db-${var.env}"
    Project = var.project_name
    Env     = var.env
  }
}

resource "aws_security_group" "proxy" {
  name        = "${var.project_name}-db-proxy-${var.env}"
  description = "RDS Proxy ingress"
  vpc_id      = local.effective_vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-db-proxy-${var.env}"
    Project = var.project_name
    Env     = var.env
  }
}

resource "aws_vpc_security_group_ingress_rule" "proxy_cidrs" {
  for_each = toset(var.proxy_allowed_cidrs)

  security_group_id = aws_security_group.proxy.id
  description       = "Ingress to RDS Proxy"
  from_port         = var.db_port
  to_port           = var.db_port
  ip_protocol       = "tcp"
  cidr_ipv4         = each.value
}

resource "aws_db_instance" "main" {
  identifier                          = "${var.project_name}-postgres-${var.env}"
  engine                              = "postgres"
  instance_class                      = var.db_instance_class
  db_name                             = var.db_name
  username                            = var.db_master_username
  manage_master_user_password         = true
  master_user_secret_kms_key_id       = "alias/aws/secretsmanager"
  allocated_storage                   = var.db_allocated_storage_gb
  max_allocated_storage               = var.db_max_allocated_storage_gb
  port                                = var.db_port
  db_subnet_group_name                = aws_db_subnet_group.main.name
  vpc_security_group_ids              = [aws_security_group.db.id]
  publicly_accessible                 = true
  storage_encrypted                   = true
  kms_key_id                          = "alias/aws/rds"
  iam_database_authentication_enabled = true
  backup_retention_period             = local.backup_retention_days
  multi_az                            = local.is_prod
  deletion_protection                 = local.is_prod
  apply_immediately                   = true
  skip_final_snapshot                 = !local.is_prod
  final_snapshot_identifier           = local.is_prod ? "${var.project_name}-postgres-${var.env}-final" : null

  tags = {
    Name    = "${var.project_name}-postgres-${var.env}"
    Project = var.project_name
    Env     = var.env
  }
}

data "aws_iam_policy_document" "rds_proxy_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["rds.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "rds_proxy" {
  name               = "${var.project_name}-rds-proxy-${var.env}"
  assume_role_policy = data.aws_iam_policy_document.rds_proxy_assume_role.json
}

data "aws_iam_policy_document" "rds_proxy_secrets" {
  statement {
    actions = [
      "secretsmanager:GetSecretValue"
    ]
    resources = [aws_db_instance.main.master_user_secret[0].secret_arn]
  }

  statement {
    actions   = ["kms:Decrypt"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "rds_proxy_secrets" {
  name   = "${var.project_name}-rds-proxy-secrets-${var.env}"
  policy = data.aws_iam_policy_document.rds_proxy_secrets.json
}

resource "aws_iam_role_policy_attachment" "rds_proxy_secrets" {
  role       = aws_iam_role.rds_proxy.name
  policy_arn = aws_iam_policy.rds_proxy_secrets.arn
}

resource "aws_db_proxy" "main" {
  name                   = "${var.project_name}-proxy-${var.env}"
  engine_family          = "POSTGRESQL"
  role_arn               = aws_iam_role.rds_proxy.arn
  vpc_subnet_ids         = local.effective_subnet_ids
  vpc_security_group_ids = [aws_security_group.proxy.id]
  require_tls            = true
  idle_client_timeout    = var.db_proxy_idle_client_timeout_seconds

  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "REQUIRED"
    secret_arn  = aws_db_instance.main.master_user_secret[0].secret_arn
  }

  tags = {
    Name    = "${var.project_name}-proxy-${var.env}"
    Project = var.project_name
    Env     = var.env
  }
}

resource "aws_db_proxy_default_target_group" "main" {
  db_proxy_name = aws_db_proxy.main.name

  connection_pool_config {
    connection_borrow_timeout    = 120
    max_connections_percent      = 90
    max_idle_connections_percent = 50
  }
}

resource "aws_db_proxy_target" "main" {
  db_proxy_name          = aws_db_proxy.main.name
  target_group_name      = aws_db_proxy_default_target_group.main.name
  db_instance_identifier = aws_db_instance.main.identifier
}

resource "aws_iam_openid_connect_provider" "vercel" {
  url = "https://oidc.vercel.com/${var.vercel_team_slug}"

  client_id_list = [local.vercel_audience]
  thumbprint_list = [
    data.tls_certificate.vercel_oidc.certificates[0].sha1_fingerprint
  ]
}

data "aws_iam_policy_document" "vercel_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.vercel.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "oidc.vercel.com/${var.vercel_team_slug}:aud"
      values   = [local.vercel_audience]
    }

    condition {
      test     = "StringLike"
      variable = "oidc.vercel.com/${var.vercel_team_slug}:sub"
      values   = local.vercel_subjects
    }
  }
}

resource "aws_iam_role" "vercel_db_connect" {
  name               = "${var.project_name}-vercel-db-connect-${var.env}"
  assume_role_policy = data.aws_iam_policy_document.vercel_assume_role.json
}

data "aws_iam_policy_document" "vercel_db_connect" {
  statement {
    actions = ["rds-db:connect"]
    resources = [
      "arn:aws:rds-db:${var.aws_region}:${local.account_id}:dbuser:*/${var.db_iam_app_username}",
      "arn:aws:rds-db:${var.aws_region}:${local.account_id}:dbuser:*/${var.db_master_username}"
    ]
  }
}

resource "aws_iam_policy" "vercel_db_connect" {
  name   = "${var.project_name}-vercel-db-connect-${var.env}"
  policy = data.aws_iam_policy_document.vercel_db_connect.json
}

resource "aws_iam_role_policy_attachment" "vercel_db_connect" {
  role       = aws_iam_role.vercel_db_connect.name
  policy_arn = aws_iam_policy.vercel_db_connect.arn
}
