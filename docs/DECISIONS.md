
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
**Implications:** App stack validation/plan/apply happens in GHA; bootstrap remains the controlled local-admin exception.

---

## 2026-02-28 — M1-13 uses RDS + Proxy + Vercel OIDC role

**Decision:** Provision RDS Postgres with IAM database auth enabled, front it with RDS Proxy, and grant Vercel OIDC a dedicated `rds-db:connect` role.
**Context:** M1-13 requires AWS-hosted Postgres and secure app-to-DB auth without static long-lived AWS credentials.
**Implications:** App stack now includes DB/proxy/networking/role outputs and environment-specific defaults (backup retention and Multi-AZ).
