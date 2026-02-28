
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

## 2026-02-28 — RDS Proxy allows both IAM and password auth

**Decision:** Set RDS Proxy `iam_auth` to `OPTIONAL` (accepts both IAM tokens and password auth) and route all traffic — app runtime and migrations — through the proxy.  
**Context:** GHA migrations connect as `lumigraph_admin` using a password from Secrets Manager. Vercel connects as `app_user` using IAM auth tokens. With `iam_auth = "REQUIRED"`, password-based migration connections were rejected.  
**Alternatives:** Open the DB security group to allow direct GHA → RDS instance connections, bypassing the proxy.  
**Consequences:** Single entry point (proxy) for all database traffic. Proxy still enforces TLS. `proxy_allowed_cidrs` defaults to `0.0.0.0/0` since both GHA and Vercel use dynamic IPs.
