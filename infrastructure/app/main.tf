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

data "aws_kms_key" "rds" {
  key_id = "alias/aws/rds"
}

data "aws_kms_key" "secretsmanager" {
  key_id = "alias/aws/secretsmanager"
}

data "tls_certificate" "vercel_oidc" {
  url = "https://oidc.vercel.com/${var.vercel_team_slug}"
}

locals {
  account_id = data.aws_caller_identity.current.account_id

  is_prod = var.env == "prod"

  effective_vpc_id = var.vpc_id != null ? var.vpc_id : data.aws_vpc.default[0].id

  effective_subnet_ids = length(var.subnet_ids) > 0 ? var.subnet_ids : sort(data.aws_subnets.default_vpc[0].ids)

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

  create_download_zip_lambda        = var.download_zip_lambda_arn == null
  managed_download_zip_lambda_name  = "${var.project_name}-download-zip-${var.env}"
  effective_download_zip_lambda_arn = local.create_download_zip_lambda ? aws_lambda_function.download_zip[0].arn : var.download_zip_lambda_arn

  create_auto_thumb_lambda        = var.auto_thumb_lambda_arn == null
  managed_auto_thumb_lambda_name  = "${var.project_name}-auto-thumb-${var.env}"
  effective_auto_thumb_lambda_arn = local.create_auto_thumb_lambda ? aws_lambda_function.auto_thumb[0].arn : var.auto_thumb_lambda_arn
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

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  rule {
    id     = "expire-generated-exports"
    status = "Enabled"

    filter {
      tag {
        key   = "lumigraph-kind"
        value = "export"
      }
    }

    expiration {
      days = var.download_exports_expiration_days
    }
  }
}

data "aws_iam_policy_document" "download_zip_lambda_assume_role" {
  count = local.create_download_zip_lambda ? 1 : 0

  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "download_zip_lambda" {
  count = local.create_download_zip_lambda ? 1 : 0

  name               = "${var.project_name}-download-zip-${var.env}"
  assume_role_policy = data.aws_iam_policy_document.download_zip_lambda_assume_role[0].json
}

data "aws_iam_policy_document" "download_zip_lambda" {
  count = local.create_download_zip_lambda ? 1 : 0

  statement {
    sid = "CloudWatchLogs"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:${var.aws_region}:${local.account_id}:*"]
  }

  statement {
    sid = "ReadIntegrationSetObjects"
    actions = [
      "s3:GetObject"
    ]
    resources = [
      "${aws_s3_bucket.artifacts.arn}/users/*/integration-sets/*"
    ]
  }

  statement {
    sid = "WriteExportObjects"
    actions = [
      "s3:PutObject",
      "s3:PutObjectTagging"
    ]
    resources = [
      "${aws_s3_bucket.artifacts.arn}/users/*/exports/*"
    ]
  }
}

resource "aws_iam_role_policy" "download_zip_lambda" {
  count = local.create_download_zip_lambda ? 1 : 0

  name   = "${var.project_name}-download-zip-${var.env}"
  role   = aws_iam_role.download_zip_lambda[0].id
  policy = data.aws_iam_policy_document.download_zip_lambda[0].json
}

resource "aws_lambda_function" "download_zip" {
  count = local.create_download_zip_lambda ? 1 : 0

  function_name = local.managed_download_zip_lambda_name
  role          = aws_iam_role.download_zip_lambda[0].arn
  filename      = var.download_zip_lambda_package_path
  handler       = "main.handler"
  runtime       = "python3.12"
  timeout       = var.download_zip_lambda_timeout_seconds
  memory_size   = var.download_zip_lambda_memory_mb

  reserved_concurrent_executions = var.download_zip_lambda_reserved_concurrency
  source_code_hash               = filebase64sha256(var.download_zip_lambda_package_path)

  environment {
    variables = {
      INTERNAL_CALLBACK_SECRET        = var.internal_callback_secret
      VERCEL_AUTOMATION_BYPASS_SECRET = var.vercel_automation_bypass_secret
    }
  }

  lifecycle {
    precondition {
      condition     = length(var.internal_callback_secret) > 0
      error_message = "internal_callback_secret must be set when provisioning the managed download ZIP Lambda."
    }
    precondition {
      condition     = length(trim(var.download_zip_lambda_package_path, " ")) > 0 && fileexists(var.download_zip_lambda_package_path)
      error_message = "download_zip_lambda_package_path must point to an existing ZIP built by CI."
    }
  }

  tags = {
    Project = var.project_name
    Env     = var.env
  }
}

data "aws_iam_policy_document" "auto_thumb_lambda_assume_role" {
  count = local.create_auto_thumb_lambda ? 1 : 0

  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "auto_thumb_lambda" {
  count = local.create_auto_thumb_lambda ? 1 : 0

  name               = "${var.project_name}-auto-thumb-${var.env}"
  assume_role_policy = data.aws_iam_policy_document.auto_thumb_lambda_assume_role[0].json
}

data "aws_iam_policy_document" "auto_thumb_lambda" {
  count = local.create_auto_thumb_lambda ? 1 : 0

  statement {
    sid = "CloudWatchLogs"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:${var.aws_region}:${local.account_id}:*"]
  }

  statement {
    sid = "ReadFinalImageObjects"
    actions = [
      "s3:GetObject"
    ]
    resources = [
      "${aws_s3_bucket.artifacts.arn}/users/*/posts/*/final/*"
    ]
  }

  statement {
    sid = "WriteFinalThumbObjects"
    actions = [
      "s3:PutObject"
    ]
    resources = [
      "${aws_s3_bucket.artifacts.arn}/users/*/posts/*/final/thumbs/*"
    ]
  }
}

resource "aws_iam_role_policy" "auto_thumb_lambda" {
  count = local.create_auto_thumb_lambda ? 1 : 0

  name   = "${var.project_name}-auto-thumb-${var.env}"
  role   = aws_iam_role.auto_thumb_lambda[0].id
  policy = data.aws_iam_policy_document.auto_thumb_lambda[0].json
}

resource "aws_lambda_function" "auto_thumb" {
  count = local.create_auto_thumb_lambda ? 1 : 0

  function_name = local.managed_auto_thumb_lambda_name
  role          = aws_iam_role.auto_thumb_lambda[0].arn
  filename      = var.auto_thumb_lambda_package_path
  handler       = "main.handler"
  runtime       = "python3.12"
  timeout       = var.auto_thumb_lambda_timeout_seconds
  memory_size   = var.auto_thumb_lambda_memory_mb

  reserved_concurrent_executions = var.auto_thumb_lambda_reserved_concurrency
  source_code_hash               = filebase64sha256(var.auto_thumb_lambda_package_path)

  environment {
    variables = {
      INTERNAL_CALLBACK_SECRET        = var.internal_callback_secret
      AUTO_THUMB_MAX_WIDTH            = tostring(var.auto_thumb_max_width)
      AUTO_THUMB_MAX_HEIGHT           = tostring(var.auto_thumb_max_height)
      AUTO_THUMB_WEBP_QUALITY         = tostring(var.auto_thumb_webp_quality)
      VERCEL_AUTOMATION_BYPASS_SECRET = var.vercel_automation_bypass_secret
    }
  }

  lifecycle {
    precondition {
      condition     = length(var.internal_callback_secret) > 0
      error_message = "internal_callback_secret must be set when provisioning the managed auto-thumb Lambda."
    }
    precondition {
      condition     = length(trim(var.auto_thumb_lambda_package_path, " ")) > 0 && fileexists(var.auto_thumb_lambda_package_path)
      error_message = "auto_thumb_lambda_package_path must point to an existing ZIP built by CI."
    }
  }

  tags = {
    Project = var.project_name
    Env     = var.env
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

  # Ingress is managed by aws_vpc_security_group_ingress_rule (db_from_runner, db_public).
  # prevent_destroy: RDS uses this SG; destroying it would require detaching the RDS ENI,
  # which is not allowed (400 AuthFailure). Block destroy so apply can complete.
  # Description intentionally stays as-is to avoid ForceNew replacement of the live DB SG.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "db_from_runner" {
  count = var.runner_security_group_id != "" ? 1 : 0

  security_group_id            = aws_security_group.db.id
  description                  = "PostgreSQL from GHA runner (migrations)"
  from_port                    = var.db_port
  to_port                      = var.db_port
  ip_protocol                  = "tcp"
  referenced_security_group_id = var.runner_security_group_id
}

resource "aws_vpc_security_group_ingress_rule" "db_public" {
  security_group_id = aws_security_group.db.id
  description       = "Direct PostgreSQL access (Vercel / external)"
  from_port         = var.db_port
  to_port           = var.db_port
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_db_instance" "main" {
  identifier                    = "${var.project_name}-postgres-${var.env}"
  engine                        = "postgres"
  engine_version                = var.db_engine_version
  instance_class                = var.db_instance_class
  db_name                       = var.db_name
  username                      = var.db_master_username
  manage_master_user_password   = true
  master_user_secret_kms_key_id = data.aws_kms_key.secretsmanager.arn
  allocated_storage             = var.db_allocated_storage_gb
  max_allocated_storage         = var.db_max_allocated_storage_gb
  port                          = var.db_port
  db_subnet_group_name          = aws_db_subnet_group.main.name
  vpc_security_group_ids        = [aws_security_group.db.id]
  # publicly_accessible                 = !local.is_prod
  # Vercel connects directly to the RDS instance.
  # IAM auth + TLS enforced; tighten with Vercel static IPs on Pro upgrade.
  publicly_accessible                 = true
  storage_encrypted                   = true
  kms_key_id                          = data.aws_kms_key.rds.arn
  iam_database_authentication_enabled = true
  auto_minor_version_upgrade          = true
  backup_retention_period             = local.backup_retention_days
  multi_az                            = var.db_multi_az
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
      "arn:aws:rds-db:${var.aws_region}:${local.account_id}:dbuser:*/${var.db_iam_app_username}"
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

# S3 artifacts bucket: presigned upload/download URLs from Vercel
data "aws_iam_policy_document" "vercel_s3_artifacts" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject"
    ]
    resources = ["${aws_s3_bucket.artifacts.arn}/*"]
  }

  statement {
    actions = ["lambda:InvokeFunction"]
    resources = [
      local.effective_download_zip_lambda_arn,
      local.effective_auto_thumb_lambda_arn
    ]
  }
}

resource "aws_iam_policy" "vercel_s3_artifacts" {
  name   = "${var.project_name}-vercel-s3-artifacts-${var.env}"
  policy = data.aws_iam_policy_document.vercel_s3_artifacts.json
}

resource "aws_iam_role_policy_attachment" "vercel_s3_artifacts" {
  role       = aws_iam_role.vercel_db_connect.name
  policy_arn = aws_iam_policy.vercel_s3_artifacts.arn
}
