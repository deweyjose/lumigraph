# ENGINEERING.md — Lumigraph
Version: 0.1  
Last updated: 2026-03-01

## 0) Engineering Principles (Guardrails)
- Prefer boring tech. Optimize for maintainability.
- TypeScript strict everywhere.
- No business logic in route handlers.
- Input validation for every endpoint.
- Avoid “magic strings”: use enums/constants.
- Avoid premature microservices.
- Every new feature updates PRODUCT.md and (if structural) ARCHITECTURE.md.
- Write tests where it matters (validation, permissions, critical flows).

## 1) Definition of Done
A ticket is done when:
- acceptance criteria met
- types pass (tsc)
- lint passes
- migrations applied cleanly
- basic tests pass
- docs updated (when applicable)

## 2) Milestones
### M1 — Publishable Image Post (MVP)
User can:
- sign up / sign in
- create an image post (draft)
- upload final image (original + web derivative)
- create a dataset
- upload dataset artifacts to S3 (presigned)
- publish post
Public can:
- browse gallery
- open post detail page
- download dataset artifacts according to visibility rules

### M2 — AI Writeup Assist
- Generate draft writeup based on metadata + user bullet notes
- Never auto-publish; user must edit/approve
- Save drafts with version history (simple)

### M3 — Workflow capture (Phase 2 start)
- Add workflow entities + step authoring UI
- Attach artifacts to steps
- Export bundle zip

## 3) Epics → Stories (M1)
### Epic: Repo + Tooling
- TS config, lint, formatting
- env var strategy
- local dev README

### Epic: Auth
- NextAuth setup
- user table
- protected routes/middleware

### Epic: Image Posts
- Create/edit/publish flows
- slug generation
- gallery listing
- public page rendering

### Epic: Datasets + Artifacts
- dataset CRUD
- presigned upload API
- artifact registration API
- download endpoints + tracking

### Epic: Media Processing (minimal)
- upload final image
- generate thumb/web (can be basic early; background jobs later)

## 4) Conventions
### File Structure
- `apps/web/app` for routes
- `apps/web/src/server` for server logic
- `packages/db` for schema + migrations + db client
- `packages/types` for shared domain types

### Error Handling
- Use typed error classes with HTTP mapping
- Always return structured JSON errors:
  `{ code, message, details? }`

### Validation
- Zod schemas for all request bodies and params
- Parse/validate at boundary, then pass typed objects inward.

## 5) Local Development

### Database (local)

Postgres runs via Docker. The app connects with `DATABASE_URL` when not on Vercel (see `packages/db` `getPrisma()`). Deployed/Vercel uses IAM auth and is unchanged.

**One-time setup**

1. Start Postgres:
   ```bash
   docker compose up -d
   ```
2. Create env files from examples:
   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   ```
   - Root `.env` — used by Prisma CLI (`pnpm db:migrate`, `pnpm db:studio`). Only needs `DATABASE_URL`.
   - `apps/web/.env` — used by Next.js (`pnpm dev`, `pnpm build`). Needs `DATABASE_URL`, `AUTH_SECRET`, and optionally OAuth/email/AWS vars.
   - Generate `AUTH_SECRET` with `openssl rand -base64 33`.
3. Apply migrations:
   ```bash
   pnpm db:migrate
   ```
   Or use the convenience script that starts Postgres and runs migrations:
   ```bash
   pnpm dev:db
   ```

**Run the app**

```bash
pnpm dev
```

**Scripts**

- `pnpm dev` — start Next.js dev server
- `pnpm db:migrate` — apply Prisma migrations (requires Postgres running and `DATABASE_URL` in root `.env`)
- `pnpm dev:db` — start Postgres (docker compose up -d), wait for ready, then run migrations
- `pnpm lint` — lint
- `pnpm test` — unit tests
- `pnpm test:integration` — integration tests (requires Postgres; use when DB is already up)
- `pnpm test:integration:docker` — run integration tests via docker-compose (starts Postgres if needed, then runs tests in a container)

### Integration tests (docker-compose)

To run integration tests in the same way as CI (Postgres + LocalStack in Docker):

```bash
docker compose up -d postgres localstack   # if not already up
docker compose run --rm integration
```

Or use the convenience script:

```bash
pnpm test:integration:docker
```

The integration service installs dependencies, generates the Prisma client, applies migrations, and runs the vitest integration projects (`db-integration`, `web-integration`). It uses the same `docker-compose.yml` and `DATABASE_URL` as local dev.

### S3 integration tests (LocalStack)

The S3 presigned-URL integration test runs only when `AWS_S3_ENDPOINT` is set. Other integration tests (user, dataset, artifact, image-post) do not require S3.

**Option A — Run everything in Docker (recommended for CI and one-command local run)**

No `.env` needed for S3; the integration container gets env from `docker-compose.yml`:

```bash
docker compose up -d postgres localstack
docker compose run --rm integration
# or: pnpm test:integration:docker
```

**Option B — Run integration tests locally with S3 against LocalStack**

Use this to run `pnpm test:integration` from your machine and have the S3 test run against a local LocalStack:

1. Start LocalStack: `docker compose up -d localstack`
2. Copy the integration env example and (optionally) edit:
   ```bash
   cp apps/web/.env.integration.example apps/web/.env.integration
   ```
   `.env.integration` is gitignored; it should contain `AWS_S3_ENDPOINT`, `AWS_S3_BUCKET`, `AWS_REGION`, and LocalStack credentials (see the example file).
3. Ensure Postgres is running and `DATABASE_URL` is set (e.g. in `apps/web/.env` or your shell).
4. Run integration tests from repo root: `pnpm test:integration`

The web-integration Vitest project loads `apps/web/.env.integration` via `vitest.integration.setup.ts`. If `.env.integration` is missing or `AWS_S3_ENDPOINT` is unset, the S3 test is skipped and the rest of the integration suite still runs. The setup also sets `AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED` when an S3 endpoint is set, so LocalStack (which does not support the SDK’s default request checksums) works.

## 6) Testing Strategy (MVP)
- Unit test validation + permission checks
- Integration tests (vitest) against real Postgres via docker-compose; same flow locally and in CI
- Smoke test upload presign + artifact registration
- Playwright later for E2E

## 7) Performance Requirements (MVP)
- Public pages should be cached where possible
- Lazy-load images
- Avoid loading giant metadata blobs on list pages
