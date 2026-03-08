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
- Tool boundary: typed agent-facing actions should live under `apps/web/src/server/tools` and delegate to services rather than duplicating business rules

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
- Workflow sessions:
  - `GET /api/workflow-sessions`
  - `GET /api/workflow-sessions/:id`
- Workflow runs:
  - `GET /api/workflow-runs`
  - `GET /api/workflow-runs/:id`
  - `POST /api/workflow-runs/:id/resume`
  - `POST /api/workflow-runs/:id/retry`

## Path conventions

- Post ownership routes use `/api/posts/...`; public read routes use `/api/public/posts/...`.
- Integration-set ownership routes use `/api/integration-sets/...`.
- Artifact upload is initiated through `/api/uploads/...` after the server verifies the target post or integration set.
- Artifact viewing/downloading is exposed by asset id through `/api/assets/:id/view` and `/api/assets/:id/download`.
- Export job lifecycle stays nested under the owning integration set via `/api/integration-sets/:id/export-jobs/...`.
- Workflow inspection stays private-first under `/api/workflow-sessions/...` and `/api/workflow-runs/...`.

## Tool surfaces

- Agent-facing tool definitions live under `apps/web/src/server/tools`.
- Tool schemas validate inputs at the tool boundary before execution.
- Tool handlers call existing services so ownership checks, visibility rules, and state transitions stay centralized.
- Routes and tools are sibling transport layers over the same service logic; routes exist for HTTP clients, tools exist for agent/runtime callers.

## Agent execution persistence model

- `WorkflowDefinition` and `WorkflowStepDefinition` belong to workflow-capture work in `#92`. They describe reusable authored process templates.
- `WorkflowSession` is the durable execution context for one user's working thread around a goal or resource. It can optionally point at a workflow definition and at subject resources such as a post or integration set. `#104` persists this model now.
- `WorkflowRun` is one execution attempt within a session. A session may have many runs over time as the user retries, resumes, or switches agents/models. `#104` persists this model now.
- `RunToolCall` is the audit log for one tool invocation during a run. It stores the tool name, validated input payload, output payload or error, timestamps, and status. `#105` persists this model now.
- `RunArtifactRef` links a run to durable domain outputs such as posts, integration sets, assets, or export jobs instead of duplicating those records into agent tables. `#105` persists this model now.

## Persist now vs later

- Persist now:
  - `WorkflowSession`
  - `WorkflowRun`
  - `RunToolCall`
  - `RunArtifactRef`
- Reuse existing domain entities for durable outputs rather than creating agent-owned copies.
- Defer:
  - full message transcript persistence
  - token/billing accounting
  - speculative branch trees and rollback snapshots
  - long-term semantic memory/vector storage
  - cross-user collaboration and shared visibility modes

## Ownership, visibility, and auditability

- Sessions and runs are user-owned records by default; access follows the same server-side ownership enforcement used by posts, integration sets, assets, and export jobs.
- Visibility for execution records should remain private-first until workflow sharing is explicitly designed.
- Tool inputs and outputs should be persisted as structured JSON so runs are auditable and resumable without reverse-engineering log text.
- Run records should keep immutable timestamps and terminal status so operators and users can distinguish in-progress, failed, cancelled, and completed attempts.
- Artifact references should point at existing domain objects by id and type, preserving the source-of-truth ownership and visibility rules on those underlying objects.

## Dependency and sequencing model

- `#92` defines reusable workflow definitions and step structure.
- `#97` defines the tool names and input/output contracts that run logs will record.
- Execution persistence can start with sessions/runs/tool-call audit trails even before a full autonomous runtime exists.
- Resume/retry APIs should come after the persistence schema exists so callers can rely on stable ids and status transitions.
- Resume rules: `POST /api/workflow-runs/:id/resume` creates a new run with trigger `RESUME` only when the source run is `PENDING` or `FAILED` and the parent session is still `ACTIVE`.
- Retry rules: `POST /api/workflow-runs/:id/retry` creates a new run with trigger `RETRY` only when the source run is `FAILED` or `CANCELLED` and the parent session is still `ACTIVE`.

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
- Workflow execution persistence now stores private user-owned sessions, runs, tool-call audit rows, artifact references, and private inspection/restart APIs.
- Workflow capture remains the next layer: authored workflow definitions and ordered step templates are planned in `#116` through `#120`.

## Operational notes

- Local dev can run with Postgres + LocalStack.
- Cloud infra managed in Terraform and GitHub Actions.
