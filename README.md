# Lumigraph

## Local development

### Get the database running

1. **Start Postgres** (matches `docker-compose.yml`: Postgres 16, user `lumigraph`, password `lumigraph`, database `lumigraph_db`, port 5432):
   ```bash
   docker compose up -d
   ```

2. **Set `DATABASE_URL`** so the app and Prisma can connect locally. Connection string that matches Docker:
   ```bash
   postgresql://lumigraph:lumigraph@localhost:5432/lumigraph_db
   ```
   Copy the example env and set it:
   ```bash
   cp .env.example .env
   ```
   The example already contains this `DATABASE_URL`. Ensure the Next.js app can read it: put a `.env` in the repo root (for `pnpm db:migrate`) and in `apps/web` for `pnpm dev`, e.g. `cp .env apps/web/.env` or `ln -sf ../../.env apps/web/.env`.

3. **Apply migrations**:
   ```bash
   pnpm db:migrate
   ```
   Or in one step (start Postgres + migrate):
   ```bash
   pnpm dev:db
   ```

4. **Run the app**:
   ```bash
   pnpm dev
   ```

Infrastructure is managed with Terraform and deployed via GitHub Actions using OIDC (no long-lived AWS keys).

## One-time bootstrap (per account)

The bootstrap stack creates the Terraform state bucket, DynamoDB lock table, GitHub OIDC provider, and the GitHub Actions IAM role.

Run this once per AWS account (and per region if you want separate state per region). For example: `lumigraph-dev` and `lumigraph-prod`.

```bash
cd infrastructure/bootstrap
terraform init
terraform plan -var="aws_region=us-east-1"
terraform apply -var="aws_region=us-east-1"
```

Capture outputs:

```bash
terraform output -raw role_arn
terraform output -raw tf_state_bucket_name
terraform output -raw tf_lock_table_name
```

## Required GitHub secrets (GitHub Environments)

Create GitHub Environments named `dev` and `prod`, then add these secrets to each:
- `AWS_ROLE_ARN` = output from `role_arn`
- `AWS_REGION` = the region you deployed into (e.g. `us-east-1`)

If you **override** the default state bucket or lock table names, also add:
- `TF_STATE_BUCKET`
- `TF_LOCK_TABLE`

## Deploy app infrastructure via CI

- Push to `main` triggers the app Terraform workflow automatically.
- Manual runs are available via Actions → `Terraform` → `Run workflow`.
  - Pick the `environment` (`dev` or `prod`) when you run it manually.

For local runs, see:
- `infrastructure/bootstrap/README.md`
- `infrastructure/app/README.md`
