
# DECISIONS.md — Lumigraph
This is a lightweight decision log (ADR-lite). Every meaningful architectural/product decision gets a dated entry.

## Template
### YYYY-MM-DD — Title
**Decision:**  
**Context:**  
**Alternatives:**  
**Consequences:**  

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

**Decision:** Provision RDS Postgres with IAM database auth enabled, front it with RDS Proxy, and grant Vercel OIDC a dedicated `rds-db:connect` role.  
**Context:** M1-13 requires AWS-hosted Postgres and secure app-to-DB auth without static long-lived AWS credentials.  
**Alternatives:** Use static DB credentials stored in Vercel env vars.  
**Consequences:** App stack now includes DB/proxy/networking/role outputs and environment-specific defaults (backup retention and Multi-AZ).

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
**Consequences:** RDS Proxy remains provisioned for future use. `packages/db` exports `getPrisma()` which generates IAM auth tokens on Vercel and falls back to `DATABASE_URL` locally. A `/api/health` endpoint verifies connectivity. Vercel env vars (`DB_HOST`, `DB_USER`, `AWS_ROLE_ARN`, etc.) replace a static `DATABASE_URL`.

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
