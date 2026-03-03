# Lumigraph

## Local development

### Get the database running

1. **Start Postgres** (matches `docker-compose.yml`: Postgres 16, user `lumigraph`, password `lumigraph`, database `lumigraph_db`, port 5432):
   ```bash
   docker compose up -d
   ```

2. **Create env files** from examples:
   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   ```
   - Root `.env` — Prisma CLI (`pnpm db:migrate`). Only needs `DATABASE_URL`.
   - `apps/web/.env` — Next.js app (`pnpm dev`). Needs `DATABASE_URL`, `AUTH_SECRET`, and optionally OAuth/email/AWS vars.
   - Generate `AUTH_SECRET`: `openssl rand -base64 33`

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

5. **Auth (Auth.js v5)**: `AUTH_SECRET` must be set in `apps/web/.env` (see step 2). Optionally set `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` and `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` for OAuth providers.

6. **Lint**: ESLint uses the flat config in `apps/web/eslint.config.mjs`. Run `pnpm lint` from the repo root. If your editor linter points at the repo root, ensure it picks up `apps/web` (or run ESLint from `apps/web`).

### Testing dataset upload (Add files) locally

The **Add files** UI on a dataset detail page uses presigned S3 uploads. To test it locally you need a bucket and credentials.

**Option A — LocalStack (no AWS account)**

1. Start Postgres and LocalStack:
   ```bash
   docker compose up -d postgres localstack
   ```
2. Create a bucket (one-time). Install [awslocal](https://github.com/localstack/awscli-local) or use AWS CLI with `--endpoint-url http://localhost:4566`:
   ```bash
   aws --endpoint-url http://localhost:4566 s3 mb s3://lumigraph-dev-local
   ```
3. In `apps/web/.env` add:
   ```env
   AWS_S3_ENDPOINT=http://localhost:4566
   AWS_S3_BUCKET=lumigraph-dev-local
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=test
   AWS_SECRET_ACCESS_KEY=test
   ```
4. Run the app (`pnpm dev`), sign in, go to **Datasets** → create or open a dataset. Use **Add files**: drag-and-drop or click to select `.zip` or `.fits`/`.fit` files, then click **Upload N file(s)**. The artifact list should update after each upload.

**Option B — Real AWS**

Set `AWS_S3_BUCKET` (your dev bucket name), `AWS_REGION`, and credentials (e.g. `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) in `apps/web/.env`. Then run the app and follow the same UI steps as above.

**Automated tests:** `pnpm test:integration` runs against Postgres + LocalStack when `AWS_S3_ENDPOINT` is set (e.g. in the integration Docker service). See `docs/ENGINEERING.md` and `docker-compose.yml`.

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
