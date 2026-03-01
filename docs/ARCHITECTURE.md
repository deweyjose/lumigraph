# ARCHITECTURE.md — Lumigraph
Version: 0.2  
Last updated: 2026-02-28

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
- Web App: Next.js (App Router)
- API: Next.js route handlers (initially), evolving to service modules
- DB: AWS RDS Postgres (via RDS Proxy for app traffic)
- Storage: S3 for artifacts + images; CDN (CloudFront) optional early
- AI: external LLM provider (TBD); used for writing assistance (never auto-publish)
- Auth: NextAuth (minimal to start)

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

### Data (DB)
- Stores metadata and relationships:
  - users
  - image_posts
  - datasets
  - dataset_artifacts
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
  - max file size constraints
  - per-user quotas (later)
- Complete upload requires server-side “register artifact” call.

### Infrastructure Access
- GitHub Actions assumes AWS roles through GitHub OIDC for Terraform deploys.
- A self-hosted GHA runner (EC2, managed in `infrastructure/bootstrap`) runs inside the VPC with direct access to the RDS instance. Migrations run on this runner as `lumigraph_admin` (password from Secrets Manager). Per-environment runner labels (`lumigraph-runner-dev`, `lumigraph-runner-prod`) route jobs to the correct runner.
- Vercel assumes a team-scoped AWS role through Vercel OIDC for DB IAM auth (`rds-db:connect`).
- The RDS Proxy remains `iam_auth = "REQUIRED"` for all external (Vercel) traffic. The runner bypasses the proxy and connects directly to the RDS instance endpoint.

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
### Auth
- handled by NextAuth routes

### Image Posts
- POST /api/image-posts
- PUT /api/image-posts/:id
- POST /api/image-posts/:id/publish
- GET /api/public/image-posts/:slug
- GET /api/public/gallery

### Datasets
- POST /api/datasets
- PUT /api/datasets/:id
- POST /api/datasets/:id/artifacts/presign
- POST /api/datasets/:id/artifacts/complete
- GET /api/public/datasets/:id (or by post slug)

### Downloads
- POST /api/downloads (track event)
- GET /api/artifacts/:id/download (issues signed URL + tracks)

## 7) S3 Layout
Suggested keys (do not hardcode; create helper functions):
- `users/{userId}/images/{imagePostId}/final/original.ext`
- `users/{userId}/images/{imagePostId}/final/web.jpg`
- `users/{userId}/images/{imagePostId}/final/thumb.jpg`
- `users/{userId}/datasets/{datasetId}/{filename}`
- (Phase 2) `users/{userId}/workflows/{workflowId}/{filename}`

## 8) Background Jobs (Deferred)
Not required for MVP but plan for:
- image derivative generation (thumb/web)
- FITS header parsing
- checksum verification
- virus/malware scan (if needed)
Implementation options:
- Vercel cron + queue
- AWS Lambda + SQS
- Dedicated worker (later)

## 9) Technology Choices (initial defaults)
- Next.js App Router
- TypeScript strict mode
- Postgres + migrations
- Presigned S3 uploads
- Zod for validation
- No “fat route handlers”: keep logic in services.

## 10) Future Architecture (Phase 2+)
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
