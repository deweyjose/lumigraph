# Bootstrap (one-time, per account)

This Terraform stack creates:
- S3 bucket for Terraform state (versioned + SSE-S3)
- DynamoDB table for state locking
- GitHub Actions OIDC provider
- IAM role for GitHub Actions (least-privilege)

## Prereqs
- Terraform >= 1.6
- AWS CLI configured with a profile that can create IAM, S3, and DynamoDB resources

## 1) Configure AWS profile + region

Example (adjust profile name as needed):

```bash
aws configure --profile lumigraph-<env>
aws sso login --profile lumigraph-<env>
```

Export the profile and region for Terraform:

```bash
export AWS_PROFILE=lumigraph-<env>
export AWS_REGION=us-east-1
```

Tip: if you forget `AWS_REGION`, Terraform will prompt for `var.aws_region` and may plan replacements with names missing the region suffix. You can also set a Terraform default with `export TF_VAR_aws_region=us-east-1`.

## 2) Create/select workspace (before init/plan/apply)

Use a workspace per environment to keep bootstrap state clean:

```bash
cd infrastructure/bootstrap
terraform workspace new dev
terraform workspace select dev
```

Repeat with `prod` when bootstrapping the prod account.

## 3) Initialize, plan, apply

Run once per environment/account, in the matching workspace.

Dev (allow branches + PRs):

```bash
terraform init
terraform plan -var="aws_region=${AWS_REGION}" \
  -var='github_subjects=["repo:deweyjose/lumigraph:environment:dev","repo:deweyjose/lumigraph:pull_request","repo:deweyjose/lumigraph:ref:refs/heads/*"]'
terraform apply -var="aws_region=${AWS_REGION}" \
  -var='github_subjects=["repo:deweyjose/lumigraph:environment:dev","repo:deweyjose/lumigraph:pull_request","repo:deweyjose/lumigraph:ref:refs/heads/*"]'
```

Prod (environment-scoped + main):

```bash
terraform init
terraform plan -var="aws_region=${AWS_REGION}" \
  -var='github_subjects=["repo:deweyjose/lumigraph:environment:prod","repo:deweyjose/lumigraph:ref:refs/heads/main"]'
terraform apply -var="aws_region=${AWS_REGION}" \
  -var='github_subjects=["repo:deweyjose/lumigraph:environment:prod","repo:deweyjose/lumigraph:ref:refs/heads/main"]'
```

## 4) Capture outputs

Run these after each account bootstrap (e.g. once for `lumigraph-dev`, once for `lumigraph-prod`):

```bash
terraform output -raw role_arn
terraform output -raw oidc_provider_arn
terraform output -raw tf_state_bucket_name
terraform output -raw tf_lock_table_name
```

## 5) GitHub secrets (GitHub Environments)

Create GitHub Environments named `dev` and `prod`, then add these secrets to each:
- `AWS_ROLE_ARN` = output from `role_arn`
- `AWS_REGION` = the region you used (e.g. `us-east-1`)

If you override default names, also add:
- `TF_STATE_BUCKET`
- `TF_LOCK_TABLE`

## Notes
- Run this bootstrap stack once per AWS account (and per region if you want separate state per region).
- For multi-account setups (e.g. `lumigraph-prod` and `lumigraph-dev`), run it in each account with the appropriate `AWS_PROFILE`/`AWS_REGION`.
- Each account will produce a different `role_arn`. Store them separately in the matching GitHub Environment (`dev` vs `prod`).
- OIDC trust best practice:
  - When using GitHub Environments, `sub` can be environment-scoped (e.g. `repo:deweyjose/lumigraph:environment:dev`).
  - PRs may use `repo:deweyjose/lumigraph:pull_request`.
  - Recommended:
    - `prod`: `repo:deweyjose/lumigraph:environment:prod` and `ref:refs/heads/main`
    - `dev`: `repo:deweyjose/lumigraph:environment:dev`, `repo:deweyjose/lumigraph:pull_request`, and `ref:refs/heads/*`
  - Configure via `github_subjects` (list of OIDC subject patterns).
- If you see S3 `AccessDenied` on any `Get*` bucket call during app plans, re-apply bootstrap after updating the IAM policy in this stack.
- Default state bucket name format:
  `lumigraph-tfstate-<suffix>-<account-id>-<region>`
- Default lock table name format:
  `lumigraph-tflock-<suffix>-<account-id>-<region>`
- Override names with `-var="state_bucket_name=..."` and `-var="lock_table_name=..."` if needed.
- `name_suffix` is UUID-safe and can be set to any unique identifier (default: `main`).

## Recover local bootstrap state

If you lose local state for bootstrap, you can rebuild it by importing the existing AWS resources.
Run in the correct account/workspace (`dev` or `prod`):

```bash
cd infrastructure/bootstrap
terraform init
terraform workspace select <env>
terraform import aws_s3_bucket.tf_state <state-bucket-name>
terraform import aws_dynamodb_table.tf_lock <lock-table-name>
terraform import aws_iam_openid_connect_provider.github_actions <oidc-provider-arn>
terraform import aws_iam_role.github_actions lumigraph-github-actions
terraform import aws_iam_policy.github_actions <policy-arn>
terraform import aws_iam_role_policy_attachment.github_actions lumigraph-github-actions/<policy-arn>
```
