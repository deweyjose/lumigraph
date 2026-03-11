# App Infrastructure

This Terraform stack creates app-facing infrastructure for Lumigraph:

- Artifacts S3 bucket
- RDS PostgreSQL instance (IAM DB auth enabled, Single-AZ by default for free tier)
- Vercel OIDC provider + IAM role for `rds-db:connect`

## Execution model

- `infrastructure/app` is executed in GitHub Actions only.
- Do not run local plan/apply for this stack.
- Local/admin Terraform execution is reserved for `infrastructure/bootstrap`.

Use `.github/workflows/terraform.yml`:

- Pull requests: format/validate/plan
- `main`: auto apply
- Manual dispatch: select `environment` + `target=app` + optional `apply=true`

## Required variables
- `aws_region`

## Optional variables
- `project_name` (default: `lumigraph`)
- `env` (default: `prod`)
- `artifacts_bucket_name` (default: `<project>-artifacts-<env>-<account-id>-<region>`)
- `vpc_id` (default: default VPC)
- `subnet_ids` (default: all subnets in selected/default VPC)
- `allowed_localhost_origins`
- `allowed_vercel_preview_origins`
- `allowed_vercel_prod_origins`
- `db_name` (default: `lumigraph_db`)
- `db_master_username` (default: `lumigraph_admin`)
- `db_engine_version` (default: `17`)
- `db_instance_class` (default: `db.t4g.micro`)
- `db_allocated_storage_gb` (default: `20`)
- `db_max_allocated_storage_gb` (default: `20`, free tier)
- `db_multi_az` (default: `false`, set `true` to enable Multi-AZ at extra cost)
- `db_port` (default: `5432`)
- `db_backup_retention_days_dev` (default: `7`)
- `db_backup_retention_days_prod` (default: `14`)
- `vercel_team_slug` (default: `deweys-projects-c66e9e02`)
- `vercel_project_name` (default: `lumigraph`)
- `vercel_oidc_subjects` (default: `owner:<team>:project:<project>:environment:*`)
- `db_iam_app_username` (default: `app_user`)
- `download_zip_lambda_arn` (default: `null`; optional external Lambda ARN. If null, this stack provisions the ZIP export Lambda.)
- `download_zip_lambda_package_path` (default: `""`; CI-built ZIP package path passed via `TF_VAR_download_zip_lambda_package_path`)
- `internal_callback_secret` (required when provisioning managed Lambda; shared secret for callback signing)
- `vercel_automation_bypass_secret` (optional; required when callback URL is protected by Vercel Deployment Protection)
- `download_zip_lambda_timeout_seconds` (default: `900`)
- `download_zip_lambda_memory_mb` (default: `2048`)
- `download_zip_lambda_reserved_concurrency` (default: `null`; uses unreserved account concurrency)
- `download_exports_expiration_days` (default: `1`; expires S3 objects tagged `lumigraph-kind=export`)

## Outputs
- `artifacts_bucket_name`
- `artifacts_bucket_arn`
- `db_instance_endpoint`
- `db_instance_port`
- `db_name`
- `db_master_username`
- `db_iam_app_username`
- `vercel_db_connect_role_arn`
- `vercel_oidc_provider_arn`
- `download_zip_lambda_arn`
- `download_zip_lambda_name`
