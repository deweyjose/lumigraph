data "aws_caller_identity" "current" {}

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
      "rds:ModifyDBInstance",
      "rds:ModifyDBProxy",
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
      "ec2:AuthorizeSecurityGroupIngress",
      "ec2:AuthorizeSecurityGroupEgress",
      "ec2:RevokeSecurityGroupIngress",
      "ec2:RevokeSecurityGroupEgress",
      "ec2:DescribeVpcs",
      "ec2:DescribeSubnets",
      "ec2:DescribeNetworkInterfaces",
      "ec2:CreateTags",
      "ec2:DeleteTags",
      "ec2:DescribeTags"
    ]
    resources = ["*"]
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
}

resource "aws_iam_policy" "github_actions" {
  name   = "lumigraph-github-actions-terraform"
  policy = data.aws_iam_policy_document.github_actions_permissions.json
}

resource "aws_iam_role_policy_attachment" "github_actions" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.github_actions.arn
}
