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
