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
- AI boundary: provider integrations and prompt/schema helpers should stay behind server-side adapters, not inside route handlers

## Core domain entities

- `User`
- `Post`
- `IntegrationSet`
- `Asset`
- `DownloadJob`

## Core flows

1. Upload integration assets via presigned PUT.
2. Complete upload and persist metadata.
3. Start export job from selected integration paths.
4. Worker streams ZIP and reports progress.
5. Client fetches presigned URL and downloads ZIP.

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

## Path conventions

- Post ownership routes use `/api/posts/...`; public read routes use `/api/public/posts/...`.
- Integration-set ownership routes use `/api/integration-sets/...`.
- Artifact upload is initiated through `/api/uploads/...` after the server verifies the target post or integration set.
- Artifact viewing/downloading is exposed by asset id through `/api/assets/:id/view` and `/api/assets/:id/download`.
- Export job lifecycle stays nested under the owning integration set via `/api/integration-sets/:id/export-jobs/...`.

## Security and authz invariants

- Every mutating route requires auth.
- Ownership is checked server-side (never trust client IDs).
- Visibility controls gate reads/downloads.
- S3 keys are server-derived.

## File access pattern

- Presign upload only after the owner and target resource are verified server-side.
- Complete upload only for owned resources and expected key prefixes.
- Presign download only after authz or visibility checks pass.
- New file flows should test unauthorized access, cross-user access attempts, and invalid state transitions.

## Current implementation notes

- Integration-set visibility is currently private-only.
- Export jobs are async and progress through worker callbacks before a download URL is exposed.

## Operational notes

- Local dev can run with Postgres + LocalStack.
- Cloud infra managed in Terraform and GitHub Actions.
