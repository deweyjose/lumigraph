data "aws_caller_identity" "current" {}

data "aws_vpc" "default" {
  count   = var.vpc_id == null ? 1 : 0
  default = true
}

data "aws_subnets" "default_vpc" {
  count = length(var.subnet_ids) == 0 ? 1 : 0

  filter {
    name   = "vpc-id"
    values = [local.effective_vpc_id]
  }
}

data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

locals {
  account_id = data.aws_caller_identity.current.account_id

  effective_state_bucket_name = coalesce(
    var.state_bucket_name,
    "${var.project_name}-tfstate-${var.name_suffix}-${local.account_id}-${var.aws_region}"
  )

  effective_lock_table_name = coalesce(
    var.lock_table_name,
    "${var.project_name}-tflock-${var.name_suffix}-${local.account_id}-${var.aws_region}"
  )

  github_subjects = var.github_subjects

  effective_vpc_id     = var.vpc_id != null ? var.vpc_id : data.aws_vpc.default[0].id
  effective_subnet_ids = length(var.subnet_ids) > 0 ? var.subnet_ids : data.aws_subnets.default_vpc[0].ids

  runner_name   = "${var.project_name}-runner-${var.env}"
  runner_labels = "${var.project_name}-runner-${var.env}"
}

resource "aws_s3_bucket" "tf_state" {
  bucket = local.effective_state_bucket_name
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "tf_lock" {
  name         = local.effective_lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

# AWS-recommended approach: derive the thumbprint from the live TLS certificate chain.
data "tls_certificate" "github_actions" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [
    data.tls_certificate.github_actions.certificates[0].sha1_fingerprint
  ]
}

data "aws_iam_policy_document" "github_actions_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github_actions.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.github_subjects
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "lumigraph-github-actions"
  assume_role_policy = data.aws_iam_policy_document.github_actions_trust.json
}

# Minimal policy for Terraform to manage Lumigraph resources.
data "aws_iam_policy_document" "github_actions_permissions" {
  statement {
    sid = "StateBucketObjects"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:AbortMultipartUpload",
      "s3:ListBucketMultipartUploads"
    ]
    resources = [
      "${aws_s3_bucket.tf_state.arn}/*"
    ]
  }

  statement {
    sid = "StateBucketMeta"
    actions = [
      "s3:GetBucketLocation",
      "s3:ListBucket",
      "s3:GetBucketVersioning",
      "s3:GetEncryptionConfiguration",
      "s3:GetBucketPublicAccessBlock"
    ]
    resources = [
      aws_s3_bucket.tf_state.arn
    ]
  }

  statement {
    sid = "StateLockTable"
    actions = [
      "dynamodb:DescribeTable",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
      "dynamodb:UpdateItem"
    ]
    resources = [
      aws_dynamodb_table.tf_lock.arn
    ]
  }

  statement {
    sid = "LumigraphBuckets"
    actions = [
      "s3:CreateBucket",
      "s3:DeleteBucket",
      "s3:ListBucket",
      "s3:ListBucketMultipartUploads",
      "s3:Get*",
      "s3:PutBucketVersioning",
      "s3:PutEncryptionConfiguration",
      "s3:PutBucketPublicAccessBlock",
      "s3:PutBucketCors",
      "s3:GetBucketCors",
      "s3:PutBucketTagging",
      "s3:GetBucketTagging"
    ]
    resources = [
      "arn:aws:s3:::${var.project_name}-*"
    ]
  }

  statement {
    sid = "LumigraphBucketObjects"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:AbortMultipartUpload",
      "s3:ListBucketMultipartUploads"
    ]
    resources = [
      "arn:aws:s3:::${var.project_name}-*/*"
    ]
  }

  statement {
    sid = "S3ListAllBuckets"
    actions = [
      "s3:ListAllMyBuckets"
    ]
    resources = ["*"]
  }

  statement {
    sid = "IamReadOnly"
    actions = [
      "iam:GetRole",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
      "iam:GetPolicy",
      "iam:GetPolicyVersion",
      "iam:ListPolicyVersions",
      "iam:ListPolicies",
      "iam:ListOpenIDConnectProviders",
      "iam:GetOpenIDConnectProvider"
    ]
    resources = ["*"]
  }

  statement {
    sid = "KmsDescribeDefaultKeys"
    actions = [
      "kms:DescribeKey"
    ]
    resources = [
      "arn:aws:kms:*:${local.account_id}:alias/aws/rds",
      "arn:aws:kms:*:${local.account_id}:alias/aws/secretsmanager",
      "arn:aws:kms:*:${local.account_id}:key/*"
    ]
  }

  statement {
    sid = "SecretsManagerForRds"
    actions = [
      "secretsmanager:CreateSecret",
      "secretsmanager:DeleteSecret",
      "secretsmanager:DescribeSecret",
      "secretsmanager:GetSecretValue",
      "secretsmanager:PutSecretValue",
      "secretsmanager:UpdateSecret",
      "secretsmanager:TagResource",
      "secretsmanager:UntagResource",
      "secretsmanager:GetResourcePolicy",
      "secretsmanager:PutResourcePolicy",
      "secretsmanager:DeleteResourcePolicy"
    ]
    resources = [
      "arn:aws:secretsmanager:*:${local.account_id}:secret:rds!*"
    ]
  }

  # M1-13: RDS + RDS Proxy + Vercel OIDC role. Terraform needs to create and manage these.
  statement {
    sid = "RdsManage"
    actions = [
      "rds:AddTagsToResource",
      "rds:CreateDBInstance",
      "rds:CreateDBParameterGroup",
      "rds:CreateDBSubnetGroup",
      "rds:CreateDBProxy",
      "rds:RegisterDBProxyTargets",
      "rds:DeregisterDBProxyTargets",
      "rds:DescribeDBInstances",
      "rds:DescribeDBParameterGroups",
      "rds:DescribeDBSubnetGroups",
      "rds:DescribeDBProxies",
      "rds:DescribeDBProxyTargets",
      "rds:DescribeDBProxyTargetGroups",
      "rds:ModifyDBInstance",
      "rds:ModifyDBProxy",
      "rds:ModifyDBProxyTargetGroup",
      "rds:DeleteDBInstance",
      "rds:DeleteDBParameterGroup",
      "rds:DeleteDBSubnetGroup",
      "rds:DeleteDBProxy",
      "rds:ListTagsForResource",
      "rds:RemoveTagsFromResource"
    ]
    resources = ["*"]
  }

  statement {
    sid = "Ec2SecurityGroupsAndNetwork"
    actions = [
      "ec2:CreateSecurityGroup",
      "ec2:DeleteSecurityGroup",
      "ec2:DescribeSecurityGroups",
      "ec2:DescribeSecurityGroupRules",
      "ec2:DescribeVpcAttribute",
      "ec2:AuthorizeSecurityGroupIngress",
      "ec2:AuthorizeSecurityGroupEgress",
      "ec2:RevokeSecurityGroupIngress",
      "ec2:RevokeSecurityGroupEgress",
      "ec2:DescribeVpcs",
      "ec2:DescribeSubnets",
      "ec2:DescribeNetworkInterfaces",
      "ec2:CreateTags",
      "ec2:DeleteTags",
      "ec2:DescribeTags",
      "ec2:DetachNetworkInterface",
      "ec2:AttachNetworkInterface"
    ]
    resources = ["*"]
  }

  # M1-15: EC2 instance management for the self-hosted GHA runner.
  statement {
    sid = "Ec2InstanceManagement"
    actions = [
      "ec2:RunInstances",
      "ec2:TerminateInstances",
      "ec2:StartInstances",
      "ec2:StopInstances",
      "ec2:DescribeInstances",
      "ec2:DescribeInstanceStatus",
      "ec2:DescribeInstanceAttribute",
      "ec2:ModifyInstanceAttribute",
      "ec2:DescribeImages",
      "ec2:DescribeInstanceTypes",
      "ec2:DescribeVolumes",
      "ec2:DescribeKeyPairs"
    ]
    resources = ["*"]
  }

  statement {
    sid = "IamInstanceProfiles"
    actions = [
      "iam:CreateInstanceProfile",
      "iam:DeleteInstanceProfile",
      "iam:GetInstanceProfile",
      "iam:AddRoleToInstanceProfile",
      "iam:RemoveRoleFromInstanceProfile",
      "iam:ListInstanceProfilesForRole"
    ]
    resources = [
      "arn:aws:iam::${local.account_id}:instance-profile/${var.project_name}-*"
    ]
  }

  statement {
    sid = "SsmParameterRead"
    actions = [
      "ssm:GetParameter"
    ]
    resources = [
      "arn:aws:ssm:${var.aws_region}:*:parameter/aws/service/ami-amazon-linux-latest/*"
    ]
  }

  statement {
    sid = "IamRolesAndPoliciesForRdsAndVercel"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:GetRole",
      "iam:PassRole",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:GetRolePolicy",
      "iam:CreatePolicy",
      "iam:DeletePolicy",
      "iam:CreatePolicyVersion",
      "iam:DeletePolicyVersion",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
      "iam:ListInstanceProfilesForRole",
      "iam:GetPolicy",
      "iam:GetPolicyVersion",
      "iam:ListPolicyVersions",
      "iam:ListPolicies"
    ]
    resources = [
      "arn:aws:iam::${local.account_id}:role/lumigraph-*",
      "arn:aws:iam::${local.account_id}:policy/lumigraph-*"
    ]
  }

  # OIDC provider ARN is unknown until after creation, so resources must be "*".
  statement {
    sid = "IamOpenIdConnectProvidersForVercel"
    actions = [
      "iam:CreateOpenIDConnectProvider",
      "iam:DeleteOpenIDConnectProvider",
      "iam:UpdateOpenIDConnectProviderThumbprint",
      "iam:AddClientIDToOpenIDConnectProvider",
      "iam:RemoveClientIDFromOpenIDConnectProvider",
      "iam:TagOpenIDConnectProvider",
      "iam:UntagOpenIDConnectProvider"
    ]
    resources = ["*"]
  }

  statement {
    sid = "IamCreateRdsServiceLinkedRole"
    actions = [
      "iam:CreateServiceLinkedRole"
    ]
    resources = [
      "arn:aws:iam::*:role/aws-service-role/rds.amazonaws.com/AWSServiceRoleForRDS"
    ]
    condition {
      test     = "StringLike"
      variable = "iam:AWSServiceName"
      values   = ["rds.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "github_actions" {
  name   = "lumigraph-github-actions-terraform"
  policy = data.aws_iam_policy_document.github_actions_permissions.json
}

resource "aws_iam_role_policy_attachment" "github_actions" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.github_actions.arn
}

# =============================================================================
# M1-15: Self-hosted GitHub Actions runner
# =============================================================================

resource "aws_security_group" "runner" {
  name        = "${var.project_name}-gha-runner-${var.env}"
  description = "GHA self-hosted runner - egress only"
  vpc_id      = local.effective_vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-gha-runner-${var.env}"
    Project = var.project_name
    Env     = var.env
  }
}

data "aws_iam_policy_document" "runner_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "runner" {
  name               = "${var.project_name}-gha-runner-${var.env}"
  assume_role_policy = data.aws_iam_policy_document.runner_assume_role.json

  tags = {
    Project = var.project_name
    Env     = var.env
  }
}

data "aws_iam_policy_document" "runner_permissions" {
  statement {
    sid = "SecretsManagerReadRds"
    actions = [
      "secretsmanager:GetSecretValue"
    ]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${local.account_id}:secret:rds!*"
    ]
  }

  statement {
    sid = "SecretsManagerReadRunnerPat"
    actions = [
      "secretsmanager:GetSecretValue"
    ]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${local.account_id}:secret:${var.runner_pat_secret_name}-*"
    ]
  }

  statement {
    sid = "KmsDecrypt"
    actions = [
      "kms:Decrypt"
    ]
    resources = [
      "arn:aws:kms:${var.aws_region}:${local.account_id}:key/*"
    ]
  }

  statement {
    sid = "RdsDescribe"
    actions = [
      "rds:DescribeDBInstances"
    ]
    resources = ["*"]
  }

  statement {
    sid = "SsmSessionManager"
    actions = [
      "ssmmessages:CreateControlChannel",
      "ssmmessages:CreateDataChannel",
      "ssmmessages:OpenControlChannel",
      "ssmmessages:OpenDataChannel",
      "ssm:UpdateInstanceInformation"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "runner" {
  name   = "${var.project_name}-gha-runner-${var.env}"
  policy = data.aws_iam_policy_document.runner_permissions.json
}

resource "aws_iam_role_policy_attachment" "runner" {
  role       = aws_iam_role.runner.name
  policy_arn = aws_iam_policy.runner.arn
}

resource "aws_iam_role_policy_attachment" "runner_ssm_core" {
  role       = aws_iam_role.runner.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "runner" {
  name = "${var.project_name}-gha-runner-${var.env}"
  role = aws_iam_role.runner.name
}

resource "aws_instance" "gha_runner" {
  ami                    = data.aws_ssm_parameter.al2023_ami.value
  instance_type          = var.runner_instance_type
  subnet_id              = local.effective_subnet_ids[0]
  vpc_security_group_ids = [aws_security_group.runner.id]
  iam_instance_profile   = aws_iam_instance_profile.runner.name

  user_data = templatefile("${path.module}/templates/runner-user-data.sh", {
    aws_region             = var.aws_region
    runner_pat_secret_name = var.runner_pat_secret_name
    github_owner           = var.github_repo_owner
    github_repo            = var.github_repo_name
    runner_name            = local.runner_name
    runner_labels          = local.runner_labels
    runner_version         = var.runner_version
  })

  user_data_replace_on_change = true

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  tags = {
    Name    = local.runner_name
    Project = var.project_name
    Env     = var.env
  }
}
