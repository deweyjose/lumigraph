# Lumigraph

Lumigraph is an astrophotography publishing and dataset platform.

## What it does

- Publish final images with post metadata.
- Upload and organize integration-set files.
- Generate ZIP exports for integration sets.
- Provide AI-powered home experiences (daily canvas + chat).

## Repository layout

- `apps/web` - Next.js app (UI + API routes)
- `packages/db` - Prisma client package
- `prisma` - schema + migrations
- `infrastructure` - Terraform + infra docs
- `docs` - concise product/architecture/engineering docs
- `specs` - Speckit feature specs and implementation plans

## Quick start

Prereqs: Node 20+, pnpm, Docker.

1. Copy env files.

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
```

2. Install dependencies.

```bash
pnpm install
```

3. Start local services and apply migrations.

```bash
docker compose up -d postgres
pnpm db:migrate
```

4. Start the app.

```bash
pnpm dev
```

App runs at `http://localhost:3000`.

## Optional local S3 + Lambda (LocalStack)

```bash
docker compose up -d postgres localstack
```

Set in `apps/web/.env`:

```env
AWS_S3_ENDPOINT=http://localhost:4566
AWS_LAMBDA_ENDPOINT=http://localhost:4566
AWS_S3_BUCKET=lumigraph-dev-local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
DOWNLOAD_ZIP_LAMBDA_NAME=lumigraph-download-zip-local
AUTO_THUMB_LAMBDA_NAME=lumigraph-auto-thumb-local
INTERNAL_CALLBACK_SECRET=lumigraph-local-callback-secret
```

## Quality gates

Before calling a substantial change done:

```bash
pnpm format:fix
pnpm format
pnpm typecheck
pnpm lint
pnpm test
```

Integration suite (Docker):

```bash
pnpm test:integration:docker
```

## Planning workflow

Roadmap discussions should become GitHub issues.

- High-level plan: `docs/ROADMAP.md`
- Execution tracking: GitHub Issues + PRs
- Specs: `specs/<feature>/`
- Canonical repo context: `docs/README.md`

## Key docs

- `docs/README.md` - docs map and ownership
- `docs/PRODUCT.md` - product scope and phases
- `docs/ARCHITECTURE.md` - system boundaries and flows
- `docs/ENGINEERING.md` - implementation and testing rules
- `docs/DECISIONS.md` - architectural decision log

## Scripts

- `pnpm dev`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm format` / `pnpm format:fix`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:integration:docker`
