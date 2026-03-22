# Architecture

## System boundaries

- Web app: Next.js (`apps/web`)
- Data: Postgres via Prisma (`prisma`, `packages/db`)
- Object storage: S3-compatible bucket
- Async export processing: Lambda-style worker callbacks

## Layering

- Route handlers: auth + validation + transport mapping
- Services: business logic, ownership/visibility rules
- Repositories/DB access: Prisma operations
- AI boundary: provider integrations and prompt/schema helpers should stay behind server-side adapters under `apps/web/src/server/ai`, not inside route handlers
- Astro Hub chat (`POST /api/chat`): streams **NDJSON** (`application/x-ndjson`) with typed events (`text_delta`, `error`, `done`) defined in `apps/web/src/server/chat-stream.ts`. The model call uses the OpenAI **Responses** API in `apps/web/src/server/ai/responses-chat.ts` (not Chat Completions) so tools and structured metadata (e.g. citations) can extend the same transport in follow-on work.
- Tool boundary: typed agent-facing actions should live under `apps/web/src/server/tools` and delegate to services rather than duplicating business rules

## Core domain entities

- `User`
- `Post`
- `IntegrationSet`
- `Asset`
- `DownloadJob`
- `AutoThumbJob`

## Core flows

1. Upload integration assets via presigned PUT.
2. Complete upload and persist metadata.
3. Start export job from selected integration paths.
4. Worker streams ZIP and reports progress.
5. Client fetches presigned URL and downloads ZIP.
6. Final image upload completion enqueues an auto-thumb job keyed by post/source version.

## API surface

- Error contract: JSON API failures use a machine-friendly envelope `{ code, message }`. Some endpoints add contextual fields, but `code` and `message` remain the stable keys.
- Success contract: success payloads remain route-specific for now to avoid breaking existing clients.
- Health:
  - `GET /api/health`
- Posts:
  - `GET /api/posts`
  - `POST /api/posts`
  - `GET /api/posts/:id`
  - `PUT /api/posts/:id`
  - `POST /api/posts/:id/publish`
  - `GET /api/posts/:id/final-assets`
  - `POST /api/posts/:id/final-assets`
  - `GET /api/public/posts`
  - `GET /api/public/posts/:slug`
- Integration sets:
  - `GET /api/integration-sets`
  - `POST /api/integration-sets`
  - `GET /api/integration-sets/:id`
  - `PUT /api/integration-sets/:id`
  - `GET /api/integration-sets/:id/assets`
  - `GET /api/integration-sets/:id/export-jobs`
  - `POST /api/integration-sets/:id/export-jobs`
  - `GET /api/integration-sets/:id/export-jobs/:jobId`
  - `POST /api/integration-sets/:id/export-jobs/:jobId`
  - `DELETE /api/integration-sets/:id/export-jobs/:jobId`
- Assets:
  - `GET /api/assets/:id/view`
  - `GET /api/assets/:id/download`
- Uploads:
  - `POST /api/uploads/presign`
  - `POST /api/uploads/presign-batch`
  - `POST /api/uploads/complete`
  - `POST /api/uploads/complete-batch`
- Internal callbacks:
  - `POST /api/internal/export-jobs/:jobId/callback`
  - `POST /api/internal/auto-thumb-jobs/:jobId/callback`
- Chat (authenticated):
  - `POST /api/chat` — NDJSON stream of assistant events for the Astro Hub widget

## Path conventions

- Post ownership routes use `/api/posts/...`; public read routes use `/api/public/posts/...`.
- Integration-set ownership routes use `/api/integration-sets/...`.
- Artifact upload is initiated through `/api/uploads/...` after the server verifies the target post or integration set.
- Artifact viewing/downloading is exposed by asset id through `/api/assets/:id/view` and `/api/assets/:id/download`.
- Export job lifecycle stays nested under the owning integration set via `/api/integration-sets/:id/export-jobs/...`.

## Tool surfaces

- Agent-facing tool definitions live under `apps/web/src/server/tools`.
- Tool schemas validate inputs at the tool boundary before execution.
- Tool handlers call existing services so ownership checks, visibility rules, and state transitions stay centralized.
- Routes and tools are sibling transport layers over the same service logic; routes exist for HTTP clients, tools exist for agent/runtime callers.

## Product shape

- The current product centers on four owned feature surfaces:
  - Astro Hub
  - Posts
  - Drafts
  - Integration Sets
- Generic workflow/orchestration code has been removed. If checklist or todo support returns later, it should attach directly to posts or integration sets rather than introducing a reusable execution engine.

## Security and authz invariants

- Every mutating route requires auth.
- Ownership is checked server-side (never trust client IDs).
- Visibility controls gate reads/downloads.
- S3 keys are server-derived.

## Auth model

### Current stack

- Auth runtime: Auth.js / NextAuth in `apps/web/auth.ts`
- Session strategy: JWT sessions, with the user id copied onto the session object in `apps/web/auth.config.ts`
- Persistence: Prisma adapter backed by Postgres
- Custom auth APIs layered on top of Auth.js:
  - `POST /api/auth/register`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`

### Why both `users` and `accounts` exist

- `users` is the canonical app identity table.
  - It stores the Lumigraph user record and shared profile fields such as `email`, `name`, `image`, and `password_hash`.
  - First-party app data like posts, integration sets, assets, and jobs all belong to `users.id`.
- `accounts` stores external login bindings for Auth.js provider accounts.
  - Each row links one `provider` + `providerAccountId` pair back to a `user_id`.
  - This is what allows a single Lumigraph user to sign in with GitHub or Google without duplicating the app-level user record.
- In practice:
  - credentials sign-in reads from `users.password_hash`
  - OAuth sign-in creates or links `accounts` rows through the Prisma adapter
  - app ownership and authorization always resolve through `users`, not through provider account ids

### Current auth surfaces

- Email + password
  - Sign-up is implemented through `POST /api/auth/register`
  - Sign-in is implemented through the Auth.js credentials provider
  - Passwords are hashed with Argon2id in `apps/web/src/server/password.ts`
- OAuth
  - GitHub and Google providers are enabled only when the corresponding env vars are present
  - OAuth account linking state is persisted in `accounts`
- Email magic link
  - Auth.js Nodemailer provider is enabled only when email env is configured
  - Verification tokens for this provider live in `verification_tokens`
- Password reset
  - Implemented with custom routes plus `VerificationToken`
  - Reset tokens use the identifier format `password-reset:${userId}` and are separate from Auth.js session state

### Active vs dormant/config-dependent flows

- Active with only `DATABASE_URL` + `AUTH_SECRET` configured:
  - email/password registration
  - email/password sign-in
- Dormant until `EMAIL_SERVER` and `EMAIL_FROM` are configured:
  - password-reset email delivery
  - email magic-link sign-in
- Dormant until provider-specific env is configured:
  - GitHub OAuth (`AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`)
  - Google OAuth (`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`)

### Current implementation boundaries

- Lumigraph intentionally keeps a small amount of custom auth logic on top of Auth.js for now:
  - password registration
  - password hashing and verification
  - password-reset token issuance and reset handling
- Standard Auth.js capabilities currently handle:
  - session management
  - OAuth provider integration
  - adapter-driven user/account persistence for OAuth and email-provider flows
- This split is workable today, but it means the product surface looks broader than the env-configured runtime often is. A local or deployed instance without email env can still show forgot-password and verify-request UI, while the actual email-dependent behavior remains dormant.

## File access pattern

- Presign upload only after the owner and target resource are verified server-side.
- Complete upload only for owned resources and expected key prefixes.
- Presign download only after authz or visibility checks pass.
- New file flows should test unauthorized access, cross-user access attempts, and invalid state transitions.

## Current implementation notes

- Integration-set visibility is currently private-only.
- Export jobs are async and progress through worker callbacks before a download URL is exposed.
- Final image uploads enqueue auto-thumb jobs and asynchronously invoke an AWS Lambda worker, with signed callback updates driving `PENDING -> RUNNING -> READY|FAILED` transitions and idempotency keyed by post plus source checksum/version.

## Operational notes

- Local dev can run with Postgres + LocalStack.
- Cloud infra managed in Terraform and GitHub Actions.
