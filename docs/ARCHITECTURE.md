# ARCHITECTURE.md — Lumigraph
Version: 0.3  
Last updated: 2026-03-01

## 0) Purpose
This document describes Lumigraph’s system architecture and engineering constraints so implementation work stays consistent across humans + AI tools.

Lumigraph is a multi-user astrophotography platform for:
- publishing final images (gallery + post pages)
- storing integration datasets/artifacts (S3)
- capturing processing workflows with guardrails (Phase 2)
- adding a PixInsight Copilot (Phase 3, local-first)
- eventually enabling cloud execution using open tools (Phase 4)

## 1) System Overview (Phase 1)
### Components
- Web App: Next.js 16 (App Router)
- API: Next.js route handlers (initially), evolving to service modules
- DB: AWS RDS Postgres (Single-AZ, direct connection with IAM auth; free-tier-friendly: db.t4g.micro, 20 GB storage)
- Storage: S3 for artifacts + images; CDN (CloudFront) optional early
- AI: OpenAI for daily canvas synthesis (NASA/Open Notify/SpaceX → GPT) and astrophotography chatbot; used for writing assistance (never auto-publish)
- Auth: Auth.js v5 (next-auth@5), JWT sessions, Prisma adapter

### Core Flows
1) Sign up / sign in
2) Create draft Image Post
3) Upload final image (original + web derivatives)
4) Create Dataset and upload artifacts to S3 (presigned URLs)
5) Publish Image Post with Dataset links
6) Public reads: gallery listing + post detail pages + downloads

## 2) Boundaries and Responsibilities
### Web (UI)
- Presents public gallery + post pages
- Provides create/edit wizards
- Shows AI-assisted drafts (human must approve)
- Supports downloads, tracking, access policies

### API
- Validates inputs
- Issues presigned S3 upload URLs
- Registers uploaded artifacts (size/checksum metadata)
- Enforces visibility policies
- Tracks downloads
- Provides public content endpoints

### Service and repository layers
Route handlers do not call the database directly. They validate input (e.g. with Zod), call **service** modules in `apps/web/src/server/services/`, and return responses. Services contain business logic (ownership checks, visibility rules) and call **repository** modules in `apps/web/src/server/repo/`. Repositories perform all Prisma access; they receive a `PrismaClient` (from `getPrisma()` in `@lumigraph/db`) so that services can reuse the same client and, when needed, run transactions. No business logic lives in route handlers or in repositories.

### Data (DB)
- Stores metadata and relationships:
  - users
  - image_posts
  - datasets
  - dataset_artifacts
  - daily_canvas (cached GenAI-synthesized astro content per day)
  - (future) workflows, steps, workflow_artifacts
- Does NOT store large blobs

### Storage (S3)
- Stores user uploads:
  - final images (original + derivatives)
  - datasets (masters, intermediates)
  - workflow artifacts (Phase 2)
- Uses presigned URL uploads

## 3) Security Model
### Uploads
- Use presigned POST/PUT URLs.
- Server validates:
  - user is authenticated
  - content-type allowlist
  - max file size constraints (default 20MB; configurable via `ARTIFACT_MAX_SIZE_BYTES` for artifacts, `FINAL_IMAGE_MAX_SIZE_BYTES` for final images; uncomment 1GB in .env.example for larger limits)
  - per-user quotas (later)
- Complete upload requires server-side “register artifact” call.

### Infrastructure Access
- GitHub Actions assumes AWS roles through GitHub OIDC for Terraform deploys.
- A self-hosted GHA runner (EC2, managed in `infrastructure/bootstrap`) runs inside the VPC with direct access to the RDS instance. Migrations run on this runner as `lumigraph_admin` (password from Secrets Manager). Per-environment runner labels (`lumigraph-runner-dev`, `lumigraph-runner-prod`) route jobs to the correct runner.
- Vercel assumes a team-scoped AWS role through Vercel OIDC (`@vercel/oidc-aws-credentials-provider`) to get temporary AWS credentials, then uses `@aws-sdk/rds-signer` to generate a 15-minute IAM auth token for RDS.
- Vercel connects **directly to the RDS instance** (publicly accessible, IAM auth + TLS enforced). RDS Proxy has been removed to reduce cost; Single-AZ and 20 GB storage caps keep the instance within AWS free-tier limits where applicable.
- The `getPrisma()` function in `@lumigraph/db` handles both paths: local dev uses `DATABASE_URL` (password-based), Vercel uses IAM auth tokens constructed at runtime.

### Database Roles
- `lumigraph_admin`: RDS master user. Runs migrations. Password managed by Secrets Manager.
- `app_user`: Application runtime user. Authenticates via IAM auth tokens (no password). Created by bootstrap migration.

### Visibility
Datasets and posts must support:
- public
- unlisted (link-only)
- private (owner only)

### Threat Model Notes
- Prevent hotlinking and abuse:
  - signed download URLs for private/unlisted (and maybe public depending on cost)
  - rate limiting (later)
- Validate all user-generated MDX/markdown to avoid XSS
- Moderation hooks: soft-delete, user bans (later)

## 4) Observability
- Structured server logs for:
  - upload presign requests
  - artifact registration
  - downloads
- Basic analytics for:
  - views
  - downloads

## 5) Data Model (Phase 1)
See docs/PRODUCT.md for canonical definitions.

## 6) API Surface (Phase 1)
### Health
- GET /api/health (DB connectivity check, public, no auth)

### Auth
- NextAuth: `/api/auth/*` (sign-in, callbacks, session).
- Credentials (email + password): same NextAuth sign-in; no separate route.
- Registration: `POST /api/auth/register` (email, password, optional name).
- Password reset (custom, not built into NextAuth): `POST /api/auth/forgot-password` (request reset email), `POST /api/auth/reset-password` (submit new password with token). Reset link: `/auth/reset-password?token=...`.
- Auth UI routes: `/auth/signin`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password` (token in query). Cross-links between sign-in and sign-up; “Forgot password?” from sign-in.

### Image Posts
- POST /api/image-posts — create draft; body may include `finalImageUrl`, `finalImageThumbUrl` (optional URLs or S3 keys); response returns full post including those fields.
- PUT /api/image-posts/:id — update draft; body may include `finalImageUrl`, `finalImageThumbUrl` (optional, nullable); response returns updated post.
- POST /api/image-posts/:id/publish
- POST /api/image-posts/:id/final-image/presign — issue presigned PUT URL for final image or thumb (auth required, owner only; body: filename, contentType from allowlist, contentLength; returns { uploadUrl, key }).
- POST /api/image-posts/:id/final-image/complete — register uploaded final image or thumb (auth required, owner only; body: key, role "image" | "thumb"; updates post and returns it).
- GET /api/image-posts/:id/image — redirect to presigned S3 URL for the post’s final image when stored as S3 key; visibility rules apply (PUBLIC/UNLISTED = anyone, DRAFT/PRIVATE = owner only).
- GET /api/image-posts/:id/thumb — redirect to presigned S3 URL for the post’s thumbnail when stored as S3 key; same visibility rules.
- GET /api/public/image-posts/:slug
- GET /api/public/gallery

### Datasets
- GET /api/datasets — list current user's datasets (auth required)
- POST /api/datasets — create dataset (auth required; body: title, optional description, visibility, imagePostId)
- PUT /api/datasets/:id — update dataset (auth required, owner only; body: optional title, description, visibility, imagePostId)
- POST /api/datasets/:id/artifacts/presign — issue presigned PUT URL for artifact upload (auth required, owner only; body: filename, contentType from allowlist, contentLength; returns { uploadUrl, key }; S3 key: users/{userId}/datasets/{datasetId}/{filename})
- POST /api/datasets/:id/artifacts/complete — register artifact metadata after upload (auth required, owner only; body: filename, fileType from allowlist, s3Key, sizeBytes, optional checksum; returns 201 + created artifact; 404 if dataset not found or not owned)
- GET /api/public/datasets/:id (or by post slug)

### Home Astro Hub
- POST /api/chat — streaming chat with astrophotography assistant (auth required; body: messages array; returns text stream)

### Downloads
- POST /api/downloads (track event)
- GET /api/artifacts/:id/download (issues signed URL + tracks)

## 7) Authentication Model (Auth.js v5 + Prisma)

Lumigraph uses Auth.js v5 (next-auth@5) with the Prisma adapter and JWT sessions. The following concepts are important for anyone working on auth or user identity.

### User vs Account

- **User**: The person. One row per human in `users` (id, email, name, image, optional password_hash, etc.). All content (image posts, datasets) is owned by a User.
- **Account**: One link between a User and an external auth method. Stored in `accounts`. A single User can have multiple Accounts—e.g. the same person signs in with Google and GitHub; both OAuth identities map to one User (same email or after linking).
- **Why both?** NextAuth separates “who the user is” (User) from “how they proved it” (Account). This allows one user to have several sign-in methods without duplicate profiles or content.

### VerificationToken

- **Purpose**: One-time, time-limited tokens used by NextAuth for **email magic-link sign-in**. When a user requests a sign-in link, NextAuth creates a VerificationToken; the link in the email includes the token; clicking it verifies and signs the user in, then the token is consumed.
- **Schema**: `identifier` (e.g. email or a namespaced string), `token`, `expires`. Unique on `(identifier, token)`.
- **Reuse for password reset**: We reuse the same table for **password-reset tokens** by using a namespaced identifier (e.g. `password-reset:${userId}`). The reset flow creates a token, emails a link, and on submit we verify the token, update the user’s password, and delete the token. NextAuth does not provide built-in password reset; we implement it ourselves using this pattern.

### Session strategy (JWT)

- Auth.js v5 **does not support database sessions with the Credentials provider** (`UnsupportedStrategy` error). Since we use email+password sign-in, we must use JWT sessions.
- The `jwt` and `session` callbacks in `auth.config.ts` attach `user.id` to the token and propagate it to the session object so server code can identify the user.
- There is no `sessions` table in the database. The `Session` model was removed from the Prisma schema since JWT sessions are purely cookie-based.
- **Trade-off**: JWTs cannot be revoked server-side. If we need "sign out everywhere" or instant ban enforcement, we would add a token blocklist or switch auth methods.

### Same user, multiple sign-in methods

- A User can have both **Accounts** (e.g. Google, GitHub) and a **password** (stored as `password_hash` on User). Sign-in can be via any configured method; same email maps to the same User.

### Schema note

- **Keep** User, Account, and VerificationToken as-is. They match Auth.js's expected model and support OAuth, magic link, credentials, and our custom password-reset flow without extra tables. Session model removed (JWT sessions don't use it).

## 8) Home Astro Hub (Daily Canvas + Chatbot)
- **Daily canvas**: Fetches NASA APOD, Open Notify ISS, SpaceX latest; synthesizes via OpenAI; caches in `daily_canvas` table by date. Generated on first request of day; fallback to prior day or static placeholder on failure.
- **Chatbot**: POST /api/chat streams OpenAI responses. Auth required. System prompt focuses on astrophotography/astronomy. Stateless (client holds conversation).
- **External APIs**: NASA (api.nasa.gov), Open Notify (iss-now), SpaceX v4 (launches). OPENAI_API_KEY and optional NASA_API_KEY in env.

## 9) S3 Layout (unchanged)
Suggested keys (do not hardcode; create helper functions):
- `users/{userId}/images/{imagePostId}/final/original.ext`
- `users/{userId}/images/{imagePostId}/final/web.jpg`
- `users/{userId}/images/{imagePostId}/final/thumb.jpg`
- `users/{userId}/datasets/{datasetId}/{filename}`
- (Phase 2) `users/{userId}/workflows/{workflowId}/{filename}`

## 10) Background Jobs (Deferred)
Not required for MVP but plan for:
- image derivative generation (thumb/web)
- FITS header parsing
- checksum verification
- virus/malware scan (if needed)
Implementation options:
- Vercel cron + queue
- AWS Lambda + SQS
- Dedicated worker (later)

## 11) Technology Choices (initial defaults)
- Next.js App Router
- TypeScript strict mode
- Postgres + migrations
- Presigned S3 uploads
- Zod for validation
- No “fat route handlers”: keep logic in services.

## 12) Future Architecture (Phase 2+)
### Workflows
- Structured workflow graph with step types
- Step guardrails must be machine-readable

### PixInsight Copilot (Phase 3)
- PJSR script/plugin sends context to API
- API responds with:
  - suggested next step
  - references to docs/workflows
  - recommended artifacts (.xpsm/.js)
- Local-first; no PixInsight-in-cloud assumptions

### Cloud Execution (Phase 4)
- Start with open tools for preprocessing
- Output masters + logs + previews
- PixInsight remains local unless licensing/partnership changes
