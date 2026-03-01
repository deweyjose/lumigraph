# ENGINEERING.md — Lumigraph
Version: 0.1  
Last updated: 2026-02-15

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
- `pnpm test` — tests

## 6) Testing Strategy (MVP)
- Unit test validation + permission checks
- Smoke test upload presign + artifact registration
- Playwright later for E2E

## 7) Performance Requirements (MVP)
- Public pages should be cached where possible
- Lazy-load images
- Avoid loading giant metadata blobs on list pages
