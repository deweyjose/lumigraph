
# DECISIONS.md — Lumigraph
This is a lightweight decision log (ADR-lite). Every meaningful architectural/product decision gets a dated entry.

## Template
### YYYY-MM-DD — Title
**Decision:**  
**Context:**  
**Alternatives:**  
**Consequences:**  

---

### 2026-03-07 — Database free tier: remove RDS Proxy, Single-AZ, cap storage
**Decision:** Optimize RDS for free tier: remove RDS Proxy (unused by Vercel and migrations), set Multi-AZ to optional with default `false`, and cap `db_max_allocated_storage_gb` at 20 GB. Instance remains `db.t4g.micro`; Vercel and GHA runner continue to use the direct RDS endpoint with IAM auth (Vercel) or master password (migrations).
**Context:** Database layer cost was too high. RDS Proxy is not in AWS free tier and was not used. Single-AZ and 20 GB storage align with RDS free tier (750 hrs/month db.t4g.micro, 20 GB storage, 20 GB backup for 12 months on new accounts).
**Consequences:** RDS Proxy and related IAM/resources removed from app Terraform. New variable `db_multi_az` (default `false`); set to `true` in tfvars if Multi-AZ is required. Output `db_proxy_endpoint` removed. Docs updated (ARCHITECTURE, DECISIONS, app README).

---

### 2026-03-03 — Final image upload: S3 key in URL columns + proxy routes
**Decision:** Store final image and thumbnail in existing `finalImageUrl` / `finalImageThumbUrl` columns as either an external URL or an S3 key (string starting with `users/`). When the value is an S3 key, the app serves it via GET `/api/image-posts/:id/image` and `/thumb`, which redirect to presigned S3 URLs. No new DB columns; UI uses `getFinalImageDisplayUrl()` to choose proxy route vs raw URL.  
**Context:** M1 requires “upload final image (original + web derivative)”. We already had presign/complete for dataset artifacts; same pattern for image posts.  
**Alternatives:** New columns `final_image_s3_key` / `final_image_thumb_s3_key` (migration, two sources of truth); storing only full URLs and generating presigned at write time (shorter expiry, harder to rotate).  
**Consequences:** Presign/complete API under `/api/image-posts/:id/final-image/*`; image/thumb GET routes enforce visibility (PUBLIC/UNLISTED = anyone, DRAFT/PRIVATE = owner). Cards and post detail use proxy URLs when value is S3 key. See ARCHITECTURE.md § Image Posts, PRODUCT.md § ImagePost.

---

### 2026-03-02 — Top-level nav: Datasets | Drafts | Gallery; Gallery public-only
**Decision:** Top-level navigation is Datasets, Drafts, Gallery. Gallery shows only public/community posts. Drafts is a dedicated route (`/drafts`) for the current user’s posts (all visibilities); auth required.  
**Context:** Users need a clear split between “my work” (datasets, drafts) and “public discovery” (gallery).  
**Alternatives:** Keep “Your posts” on the Gallery page; single “Posts” nav that mixed draft and public.  
**Consequences:** Nav order and links updated in site header; `/drafts` added; Gallery page no longer shows “Your posts”. Proxy protects `/drafts` (auth redirect). See docs/PRODUCT.md §3.5.

---

### 2026-03-01 — Unified lint and format across monorepo
**Decision:** Single ESLint flat config at repo root (`eslint.config.mjs`) and single Prettier config (`.prettierrc`) at root. Base TypeScript/JS rules apply repo-wide; Next.js rules apply only to `apps/web/**`. Root owns eslint, prettier, typescript-eslint, and @eslint/js as devDependencies. Each package has `lint` and `format` scripts that invoke the root config so `pnpm run -r lint` / `pnpm run -r format` run in all workspaces.  
**Context:** packages/db had no lint/format; we wanted one source of truth and every package to participate.  
**Alternatives:** Per-package configs (duplication); root-only scripts that lint/format the whole repo (no per-package runs).  
**Consequences:** apps/web re-exports root ESLint config for editor resolution; packages/db now has lint/format; format:fix added at root and per-package for auto-fix.

---

### 2026-02-15 — Docs-first bootstrap
**Decision:** Start repo with canonical product + architecture docs to feed Codex/AI context.  
**Context:** AI tools do not share chat history; persistent context must live in repo.  
**Alternatives:** Start with code scaffold first.  
**Consequences:** Slower first commit, faster consistent implementation thereafter.

---

### 2026-02-16 — ImagePost visibility enum (replace isPublished)
**Decision:** Replace `ImagePost.isPublished` (boolean) with `visibility` (`PostVisibility`: DRAFT, PRIVATE, UNLISTED, PUBLIC) so the schema matches the documented visibility model (public, unlisted/link-only, private).  
**Context:** ARCHITECTURE.md and PRODUCT.md require posts to support public, unlisted (link-only), and private; a boolean could not represent unlisted.  
**Alternatives:** Keep boolean and add a second field (would be redundant and error-prone).  
**Consequences:** Existing “published” rows migrated to PUBLIC; link-only visibility can be implemented without further schema change.

## 2026-02-16 — Use snake_case for DB objects

**Decision:** Use snake_case for database table/column/enum names via Prisma `@map`/`@@map`.
**Context:** We prefer snake_case for DB objects and want to keep TS-friendly model names in application code.
**Implications:** All tables, columns, and enum types are mapped to snake_case; migrations are regenerated accordingly.

---

## 2026-02-28 — App infra runs in GitHub Actions

**Decision:** Run `infrastructure/app` exclusively in GitHub Actions; reserve local/admin Terraform execution for `infrastructure/bootstrap`.  
**Context:** Team workflow uses environment-scoped GitHub OIDC roles and GitHub Environments for safe multi-account/apply behavior.  
**Alternatives:** Allow local plan/apply for app stack.  
**Consequences:** App stack validation/plan/apply happens in GHA; bootstrap remains the controlled local-admin exception.

---

## 2026-02-28 — M1-13 uses RDS + Proxy + Vercel OIDC role

**Decision:** Provision RDS Postgres with IAM database auth enabled and grant Vercel OIDC a dedicated `rds-db:connect` role. (RDS Proxy was later removed to reduce cost; Vercel and migrations use the direct RDS endpoint.)  
**Context:** M1-13 requires AWS-hosted Postgres and secure app-to-DB auth without static long-lived AWS credentials.  
**Alternatives:** Use static DB credentials stored in Vercel env vars.  
**Consequences:** App stack includes DB, networking, and role outputs; environment-specific defaults for backup retention; Multi-AZ is optional via `db_multi_az` (default false for free tier).

---

## 2026-02-28 — M1-14 Migration pipeline in GitHub Actions

**Decision:** Run `prisma migrate deploy` in GitHub Actions as the RDS master user (`lumigraph_admin`), retrieving the password from Secrets Manager. Auto-apply to dev on main merge; manual dispatch for feature branches and prod.  
**Context:** Migrations require DDL privileges that `app_user` should not have. The pipeline mirrors the Terraform workflow: validate on PRs, auto-apply dev, manual-with-approval for prod.  
**Alternatives:** Run migrations locally, or grant `app_user` DDL privileges.  
**Consequences:** `app_user` stays limited to DML at runtime. Migrations are version-controlled and run through the same GHA pipeline as infrastructure.

---

## 2026-02-28 — Bootstrap app_user via Prisma migration

**Decision:** Create the `app_user` Postgres role (with `rds_iam` grant and default privileges) in a Prisma migration rather than a standalone script or Terraform.  
**Context:** The role is a one-time setup that logically belongs with the schema. Prisma migrations run as `lumigraph_admin` which has the privileges to create roles.  
**Alternatives:** Terraform `cyrilgdn/postgresql` provider; manual SQL script.  
**Consequences:** Role setup is version-controlled and applied automatically with the first `prisma migrate deploy`.

---

## 2026-03-01 — M1-16 Bypass RDS Proxy for Vercel connectivity (MVP)

**Decision:** Connect Vercel serverless functions directly to the RDS instance (bypassing RDS Proxy) using IAM auth tokens generated via Vercel OIDC. Make the RDS instance `publicly_accessible = true` in both dev and prod.  
**Context:** RDS Proxy endpoints are VPC-only — they cannot be made publicly accessible. On the Vercel Hobby plan there is no VPC peering or static IP capability, so the proxy is unreachable. The RDS instance supports `publicly_accessible` and IAM database authentication. Security is enforced by: (a) `app_user` authenticates only via IAM tokens (no password), (b) tokens expire after 15 minutes, (c) TLS is required, (d) the DB security group can be tightened to Vercel static IPs when upgrading to Pro.  
**Alternatives:** Network Load Balancer in front of proxy (added complexity + cost); Vercel Secure Compute with VPC peering (Enterprise-only); keep RDS private and use a tunneling approach.  
**Consequences:** RDS Proxy was removed (free tier optimization). `packages/db` exports `getPrisma()` which generates IAM auth tokens on Vercel and falls back to `DATABASE_URL` locally. A `/api/health` endpoint verifies connectivity. Vercel env vars (`DB_HOST`, `DB_USER`, `AWS_ROLE_ARN`, etc.) replace a static `DATABASE_URL`.

---

## 2026-03-01 — Auth model: password on User, reset via VerificationToken

**Decision:** Store an optional `password_hash` on the User model (no separate table). Use the existing VerificationToken table for password-reset tokens with a namespaced identifier (`password-reset:${userId}`). Use Argon2 for password hashing.  
**Context:** MVP needs email+password sign-in and email-based password reset. NextAuth has no built-in password reset; we implement it. One User can have both OAuth Account(s) and a password.  
**Alternatives:** Separate `password_credentials` table (extra join, no benefit for single-password-per-user); bcrypt (Argon2 is the current OWASP-recommended default for new code); dedicated reset-token table (we reuse VerificationToken to avoid another migration and keep one token store).  
**Consequences:** User table gains optional `password_hash`; password reset flow creates/consumes VerificationToken rows; hashing and verification live in a small server module used by the Credentials provider and reset API.

---

## 2026-02-28 — M1-15 Self-hosted GHA runner in bootstrap

**Decision:** Deploy the self-hosted GitHub Actions runner EC2 instance in `infrastructure/bootstrap` rather than `infrastructure/app`.  
**Context:** The runner is Tier 0 / CI infrastructure — it runs the pipelines that deploy the app stack and execute migrations. Placing it in the app stack creates a chicken-and-egg problem: the runner must exist before GHA can target it, but the app stack is deployed by GHA. The runner also needs direct VPC access to the RDS instance (bypassing the IAM-only proxy) for password-based migration connections.  
**Alternatives:** Place the runner in `infrastructure/app` (circular dependency, requires manual first apply); use a public DB endpoint (security risk).  
**Consequences:** Bootstrap is applied locally (existing pattern). The app stack receives only a `runner_security_group_id` variable and one DB SG ingress rule. Runner labels are environment-specific (`lumigraph-runner-dev`, `lumigraph-runner-prod`) so the migrate workflow targets the correct runner per environment. One GitHub PAT stored in Secrets Manager per AWS account.

---

## 2026-03-01 — Local dev database: Docker Postgres + DATABASE_URL

**Decision:** Local development uses the existing `docker-compose.yml` (Postgres 16, user `lumigraph`, password `lumigraph`, database `lumigraph_db`, port 5432). The app connects via `DATABASE_URL` when not on Vercel; no IAM or RDS-specific setup.  
**Context:** Developers need a one-command way to run Postgres and apply migrations. The same Prisma migrations run locally (as `lumigraph`, which has full privileges) and in CI (as `lumigraph_admin` on RDS); RDS-only steps in migrations are guarded with `IF EXISTS (rds_iam, lumigraph_admin)` so they are no-ops locally.  
**Alternatives:** Separate local migration path; managed local Postgres.  
**Consequences:** Connection string is documented as `postgresql://lumigraph:lumigraph@localhost:5432/lumigraph_db`. Root script `pnpm dev:db` starts Postgres and runs migrations. README and ENGINEERING.md describe the local DB workflow.

---

## 2026-03-01 — Upgrade to Next.js 16

**Decision:** Upgrade the web app from Next.js 14 to Next.js 16 (React 19, Turbopack, latest ESLint flat config).  
**Context:** Stay on supported Next.js and React versions; benefit from Turbopack and improved tooling.  
**Changes:** (1) NextAuth API route handler updated for async `params` (Next 15+). (2) `next.config.js`: `experimental.typedRoutes` moved to top-level `typedRoutes: false`. (3) Middleware: explicit default export wrapping next-auth (type assertion for next-auth’s `NextRequestWithAuth`). (4) Lint: `next lint` removed in Next 16 — use ESLint 9 flat config; added `eslint.config.mjs`, removed `.eslintrc.json`, lint script runs `eslint . --max-warnings 0`.  
**Consequences:** Build and typecheck pass. Next-auth and eslint-config-next report peer dependency warnings (next-auth targets Next 14; we accept the mismatch for now). Middleware deprecation warning points to future migration to `proxy.ts`.

---

## 2026-03-01 — Auth.js v5, proxy, and env

**Decision:** Upgrade to Auth.js v5 (next-auth@5 beta), migrate from `middleware.ts` to `proxy.ts`, use `AUTH_*` env vars exclusively (no legacy fallback).  
**Context:** Align with Next.js 16 (proxy convention), resolve peer dependency warnings, and use latest Auth.js APIs. New project — no backwards-compatibility needed.  
**Changes:** (1) Replaced next-auth v4 with v5; use `auth.config.ts` (edge-safe) and `auth.ts` (full config with Credentials + Nodemailer + lazy Prisma adapter). (2) Lazy Prisma adapter in `src/server/lazy-prisma-adapter.ts` so Vercel IAM auth (`getPrisma()`) works with the sync adapter API. (3) API route exports `handlers` from `auth`. (4) Removed `middleware.ts`; added `proxy.ts` using `auth()` from auth.config for `/dashboard` and `/posts`. (5) `.env.example` and README document `AUTH_SECRET` and `AUTH_*` provider vars.  
**Consequences:** Session and sign-in flows unchanged. Only `AUTH_*` env vars are supported (no `NEXTAUTH_*`, `GITHUB_ID`, or `GOOGLE_CLIENT_ID` fallback). ESLint flat config remains in `apps/web/eslint.config.mjs`.

---

## 2026-03-01 — JWT sessions (Auth.js Credentials constraint)

**Decision:** Use JWT session strategy (`session: { strategy: "jwt" }`) for all auth providers. Remove the `Session` Prisma model and drop the `sessions` table.  
**Context:** Auth.js v5 does not support database sessions with the Credentials provider (`UnsupportedStrategy` error). Since we require email+password sign-in for MVP, JWT is the only option. The `sessions` table was never written to under JWT strategy — dead schema.  
**Alternatives:** Drop Credentials provider and use magic-link-only (would allow database sessions but worse UX for MVP); keep the unused Session model for future optionality (zero cost but misleading).  
**Consequences:** Sessions cannot be revoked server-side. If "sign out everywhere" or instant ban enforcement is needed later, we would add a token blocklist or transition auth methods. The `jwt` and `session` callbacks in `auth.config.ts` propagate `user.id` into the session object. Session-related adapter methods removed from the lazy Prisma adapter.

---

## 2026-03-01 — Separate .env files per package

**Decision:** Use separate `.env` files: root `.env` for Prisma CLI, `apps/web/.env` for the Next.js app. No symlinks.  
**Context:** Next.js loads `.env` from its own project root (`apps/web/`), not the monorepo root. A symlink from `apps/web/.env → ../../.env` was fragile and forced all vars into one file. The Prisma CLI only needs `DATABASE_URL`; the Next.js app needs `DATABASE_URL` plus auth, AWS, and email vars.  
**Alternatives:** Symlink (implicit, easy to miss); single root `.env` with dotenv-cli or turborepo env passthrough (extra tooling).  
**Consequences:** Each package owns its env. Some `DATABASE_URL` duplication across both files (intentional — they could diverge, e.g., Prisma CLI as admin vs app as `app_user`). Each has its own `.env.example`. Onboarding docs updated.

---

## 2026-03-01 — LocalStack for S3 integration tests

**Decision:** Use a LocalStack container in docker-compose for S3 integration tests. The integration service depends on `localstack`; when `AWS_S3_ENDPOINT` is set (e.g. `http://localstack:4566`), S3 presigned-URL tests run against LocalStack; otherwise they are skipped so local `pnpm test:integration` without Docker still passes.  
**Context:** We need to test presigned upload/download without hitting real AWS. LocalStack is a widely used, Docker-based AWS emulator; it supports S3 and works with the AWS SDK v3.  
**Alternatives:** Mock the S3 client in integration tests (less confidence); use real AWS with a test bucket (cost, credentials, flakiness); Testcontainers to spin up LocalStack per test run (heavier, more isolation).  
**Consequences:** `docker-compose.yml` has a `localstack` service (image `localstack/localstack:4.0`, port 4566). The S3 service in `apps/web/src/server/services/s3.ts` respects `AWS_S3_ENDPOINT` and uses `forcePathStyle: true` when set. CI starts `postgres` and `localstack` before running the integration container. ENGINEERING.md documents the flow.
