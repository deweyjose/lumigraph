# App Infrastructure

This Terraform stack creates the S3 bucket used for Lumigraph artifacts.

## Prereqs
- Terraform >= 1.6
- AWS credentials (use the GitHub Actions role if testing via `aws-vault`/`aws sts assume-role`)

If you use SSO profiles, make sure you have logged in and exported the profile/region:

```bash
aws sso login --profile lumigraph-<env>
export AWS_PROFILE=lumigraph-<env>
export AWS_REGION=us-east-1
export TF_VAR_env=<env>
```

## Backend configuration

This stack uses a partial S3 backend config. Create a local `backend.hcl` (do not commit).
Populate it with the outputs from the bootstrap in the same account/env:

```hcl
bucket         = "<tf_state_bucket_name>"
key            = "app/terraform.tfstate"
region         = "<aws_region>"
dynamodb_table = "<tf_lock_table_name>"
encrypt        = true
```

## Initialize, plan, apply

```bash
cd infrastructure/app
terraform init -backend-config=backend.hcl
terraform fmt -check
terraform validate
terraform plan -var="aws_region=us-east-1"
terraform apply -var="aws_region=us-east-1"
```

## Required variables
- `aws_region`

## Optional variables
- `project_name` (default: `lumigraph`)
- `env` (default: `prod`)
- `artifacts_bucket_name` (default: `<project>-artifacts-<env>-<account-id>-<region>`)
- `allowed_localhost_origins`
- `allowed_vercel_preview_origins`
- `allowed_vercel_prod_origins`
