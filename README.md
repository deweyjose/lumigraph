# Lumigraph

**A structured astrophotography journal and dataset platform.**  
Publish your images. Share your integration data. Document your processing journey.

---

## The Story

Astrophotography is patience, precision, and wonder—hours under the stars, stacking frames, chasing photons from galaxies millions of light-years away. But the journey doesn't end when the final image is processed. The real value lives in the *how*: the acquisition details, the calibration frames, the workflow that turned raw data into something worth sharing.

**Lumigraph** is built for that. It's not just a gallery. It's a place to:

- **Publish** final images with rich metadata—targets, Bortle class, acquisition notes
- **Share** integration data (FITS, stacks, masters) so others can learn and build on your work
- **Document** your processing workflows with guardrails and intent
- **Discover** what the community is capturing and how they're doing it

Today, Lumigraph is an astro journal and dataset platform. Tomorrow, it will grow into workflow construction, an AI copilot for PixInsight, and eventually cloud execution—so you spend less time on infrastructure and more time under the sky.

---

## Run Locally

**Prerequisites:** Node.js 20+, pnpm, Docker

### 1. Start the database

```bash
docker compose up -d postgres
```

Postgres 16 runs on port 5432 (`lumigraph` / `lumigraph` / `lumigraph_db`).

### 2. Configure environment

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
```

- **Root `.env`** — Prisma. Needs `DATABASE_URL` (default matches docker-compose).
- **`apps/web/.env`** — Next.js. Needs `DATABASE_URL`, `AUTH_SECRET`, and optionally OAuth/AWS.

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 33
```

### 3. Migrate and run

```bash
pnpm dev:db    # Start Postgres (if needed), wait, apply migrations
pnpm dev       # Start Next.js
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: Home Astro Hub (daily canvas + chatbot)

Add to `apps/web/.env`:

```env
OPENAI_API_KEY=sk-...           # Required for daily canvas and chatbot
NASA_API_KEY=...                 # Optional; improves NASA API rate limit
```

### Optional: Dataset uploads (S3)

**LocalStack (no AWS account):**

```bash
docker compose up -d postgres localstack
```

In `apps/web/.env`:

```env
AWS_S3_ENDPOINT=http://localhost:4566
AWS_LAMBDA_ENDPOINT=http://localhost:4566
AWS_S3_BUCKET=lumigraph-dev-local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED
AWS_RESPONSE_CHECKSUM_VALIDATION=WHEN_REQUIRED
DOWNLOAD_ZIP_LAMBDA_NAME=lumigraph-download-zip-local
DOWNLOAD_CALLBACK_SECRET=lumigraph-local-callback-secret
DOWNLOAD_CALLBACK_BASE_URL=http://host.docker.internal:3000
DOWNLOAD_EXPORT_TTL_HOURS=24
```

`docker-compose` now auto-creates `lumigraph-dev-local`, applies dev CORS, and provisions the
`lumigraph-download-zip-local` Lambda in LocalStack startup hooks.
LocalStack Lambda execution uses the host Docker socket (`/var/run/docker.sock`) from `docker-compose`.
The LocalStack Lambda init also sets S3 checksum env vars to `when_required` to avoid multipart checksum mode mismatches.
If you need to re-apply CORS manually:

```bash
aws --endpoint-url http://localhost:4566 s3api put-bucket-cors \
  --bucket lumigraph-dev-local \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["http://localhost:3000"],
      "AllowedMethods": ["PUT","GET","HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

**Real AWS:** Set `AWS_S3_BUCKET`, `AWS_REGION`, and credentials in `apps/web/.env`.
For async ZIP exports in cloud, also set:

```env
DOWNLOAD_ZIP_LAMBDA_NAME=<terraform-output-download_zip_lambda_name>
DOWNLOAD_CALLBACK_SECRET=<same-value-as-TF_VAR_download_callback_secret>
```

For protected Vercel preview/stage callbacks, set this Terraform/GitHub secret so Lambda can add the bypass header:

```env
TF_VERCEL_AUTOMATION_BYPASS_SECRET=<Vercel Protection Bypass for Automation secret>
```

Lambda ZIP packaging is built in GitHub Actions and injected into Terraform as
`TF_VAR_download_zip_lambda_package_path` (no local Lambda ZIP prep required).

---

## Stack

| Layer | Tech |
|-------|------|
| **App** | Next.js 16 (App Router), React 19, TypeScript 5 (strict) |
| **Auth** | Auth.js v5 (next-auth), JWT sessions, Prisma adapter |
| **Data** | PostgreSQL, Prisma, migrations |
| **Storage** | S3 (presigned uploads/downloads) |
| **AI** | OpenAI (daily canvas synthesis, astrophotography chatbot) |
| **Infra** | Vercel, Terraform, GitHub Actions (OIDC) |

**Monorepo:** `apps/web` (Next.js), `packages/db` (Prisma client), `infrastructure/` (Terraform).

---

## Spec Kit

Lumigraph uses **Spec Kit**—a lightweight spec-driven workflow for features. Cursor commands drive the flow:

| Command | Purpose |
|---------|---------|
| `/speckit.specify` | Create a feature spec from a natural-language description |
| `/speckit.clarify` | Resolve ambiguities with targeted questions |
| `/speckit.plan` | Generate implementation plan, research, data model, contracts |
| `/speckit.tasks` | Break the plan into dependency-ordered tasks |
| `/speckit.implement` | Execute tasks and mark progress |

**Flow:** `specify` → `clarify` (optional) → `plan` → `tasks` → `implement`.

Specs live in `specs/<branch>/` (e.g. `specs/001-home-astro-hub/`). The constitution (`.specify/memory/constitution.md`) defines architecture guardrails. See `docs/AI_CONTEXT.md` for orientation.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm dev:db` | Start Postgres + run migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm format:fix` | Prettier |
| `pnpm test` | Unit tests |
| `pnpm test:integration` | Integration tests (Postgres + optional S3) |
| `pnpm test:integration:docker` | Run integration tests in Docker |

---

## Infrastructure

- **Bootstrap** (once per AWS account): `infrastructure/bootstrap/` — Terraform state, OIDC, IAM.
- **App** (CI): `infrastructure/app/` — RDS, S3, Vercel OIDC. Deployed via GitHub Actions.
- **Secrets:** GitHub Environments `dev` and `prod` need `AWS_ROLE_ARN`, `AWS_REGION`.

See `infrastructure/bootstrap/README.md` and `infrastructure/app/README.md` for details.

---

## Docs

- [PRODUCT.md](docs/PRODUCT.md) — Vision, phases, domain concepts
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design, API surface, security
- [ENGINEERING.md](docs/ENGINEERING.md) — Conventions, local dev, testing
