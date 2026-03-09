# Workflow Orchestrator Runtime V1

## Purpose

This spec defines how Lumigraph executes authored workflow definitions at runtime.

It covers:

- workflow run lifecycle states and transitions
- run-event schema for machine consumers and operator UI
- mapping from authored step kinds to runtime behavior
- operator interaction contract for live control and human input
- persistence boundaries and migration intent from current run/session models

It does not cover:

- implementation details of the runtime executor loop
- final operator station UI implementation
- native PixInsight desktop automation

## Runtime goals

- Keep authored workflow definitions (`#117`, `#118`, `#119`, `#120`) separate from execution records.
- Make runtime execution inspectable and replayable through structured events.
- Support explicit human review/input pauses instead of hidden freeform chat behavior.
- Preserve current ownership and visibility guarantees for sessions, runs, tool calls, and artifacts.
- Provide a stable contract that `#128` (execution engine) and `#129` (operator station) can share.

## Runtime entities

- `WorkflowSession`: durable user-owned execution thread; may reference a workflow definition and subject.
- `WorkflowRun`: one execution attempt within a session.
- `RunToolCall`: persisted record of one tool invocation attempt.
- `RunArtifactRef`: persisted reference to durable artifacts touched/created by a run.
- `RunEvent` (new in orchestration runtime): append-only event stream for lifecycle, narration, step progress, tool-call intent/result, and operator interaction.

## Lifecycle model

Canonical runtime states:

- `QUEUED`
- `RUNNING`
- `WAITING_FOR_INPUT`
- `SUCCEEDED`
- `FAILED`
- `CANCELLED`

Current persistence status mapping:

| Canonical state | Current `WorkflowRun.status` | Migration intent |
| --- | --- | --- |
| `QUEUED` | `PENDING` | keep mapping; optionally rename later |
| `RUNNING` | `RUNNING` | no change |
| `WAITING_FOR_INPUT` | `RUNNING` | add explicit enum value in a follow-up migration |
| `SUCCEEDED` | `SUCCEEDED` | no change |
| `FAILED` | `FAILED` | no change |
| `CANCELLED` | `CANCELLED` | no change |

### State transitions

Allowed transitions:

- `QUEUED -> RUNNING`
- `QUEUED -> CANCELLED`
- `QUEUED -> FAILED`
- `RUNNING -> WAITING_FOR_INPUT`
- `RUNNING -> SUCCEEDED`
- `RUNNING -> FAILED`
- `RUNNING -> CANCELLED`
- `WAITING_FOR_INPUT -> RUNNING`
- `WAITING_FOR_INPUT -> FAILED`
- `WAITING_FOR_INPUT -> CANCELLED`

Terminal states: `SUCCEEDED`, `FAILED`, `CANCELLED`.

Transition invariants:

- `startedAt` is set on first transition into `RUNNING`.
- `completedAt` is set only for `SUCCEEDED` and `FAILED`.
- `cancelledAt` is set only for `CANCELLED`.
- Every transition emits exactly one terminal lifecycle event for that change.

## Run-event schema

Run events are append-only and strictly ordered per run.

Event envelope:

```json
{
  "id": "uuid",
  "runId": "uuid",
  "sessionId": "uuid",
  "sequence": 42,
  "type": "tool_call.succeeded",
  "occurredAt": "2026-03-08T20:05:00.000Z",
  "actor": "SYSTEM",
  "stepKey": "publish-post",
  "payload": {}
}
```

Envelope rules:

- `id` is globally unique.
- `sequence` is monotonically increasing per `runId` and unique per run.
- Consumers must treat delivery as at-least-once and de-duplicate by `id`.
- `payload` must be a JSON object with a type-specific schema.

### Event types

Lifecycle:

- `run.queued` `{ trigger }`
- `run.started` `{ trigger, agentKind, model }`
- `run.waiting_for_input` `{ requestId, prompt, inputSchemaJson, timeoutAt? }`
- `run.resumed` `{ reason: "INPUT_SUBMITTED" | "MANUAL_RESUME" }`
- `run.cancel_requested` `{ requestedBy: "USER" | "SYSTEM", reason? }`
- `run.cancelled` `{ reason? }`
- `run.succeeded` `{ summary? }`
- `run.failed` `{ errorCode?, message }`

Step progress:

- `step.started` `{ stepKey, position, kind, title }`
- `step.completed` `{ stepKey, position, summary? }`
- `step.failed` `{ stepKey, position, errorCode?, message }`

Narration:

- `run.message` `{ level: "INFO" | "WARN" | "ERROR", text }`

Tool interaction:

- `tool_call.requested` `{ toolName, inputJson, callId }`
- `tool_call.succeeded` `{ toolName, outputJson, callId, durationMs }`
- `tool_call.failed` `{ toolName, errorCode?, errorMessage, errorJson?, callId, durationMs }`

Human interaction:

- `operator.input_requested` `{ requestId, prompt, inputSchemaJson }`
- `operator.input_submitted` `{ requestId, submittedBy: "USER" | "SYSTEM", responseJson }`

## Step-kind runtime mapping

### `INSTRUCTION`

- Emits `step.started`.
- Emits one or more `run.message` events for instruction narration.
- Does not emit tool events.
- Emits `step.completed`.

### `TOOL_CALL`

- Emits `step.started`.
- Emits `tool_call.requested` before execution.
- Persists `RunToolCall` with the same `callId` correlation id.
- Emits `tool_call.succeeded` or `tool_call.failed` from persisted result.
- Emits `step.completed` on success or `step.failed` on failure.
- Persists `RunArtifactRef` for durable outputs referenced by tool result.

### `REVIEW`

- Emits `step.started`.
- Emits `operator.input_requested` and `run.waiting_for_input`.
- Transitions run to `WAITING_FOR_INPUT` until valid input is submitted.
- After input submission, emits `operator.input_submitted`, `run.resumed`, and then either `step.completed` or `step.failed`.

## Operator interaction model

Operator station contract is split into bootstrap data, live events, and control commands.

Bootstrap read model (already available):

- `GET /api/workflow-sessions/:id`
- `GET /api/workflow-runs/:id` (run + toolCalls + artifactRefs)

Live stream contract (to implement with `#128`/`#129`):

- `GET /api/workflow-runs/:id/events?afterSequence=<n>`
- Returns ordered events for owned runs only.
- Supports replay from `afterSequence` for reconnect/resume.

Control commands:

- `POST /api/workflow-runs/:id/commands`
- Body:

```json
{
  "command": "SUBMIT_INPUT",
  "requestId": "uuid",
  "responseJson": {}
}
```

Supported command types:

- `SUBMIT_INPUT` for review/human-input checkpoints
- `CANCEL_RUN`

Existing restart endpoints remain valid:

- `POST /api/workflow-runs/:id/resume`
- `POST /api/workflow-runs/:id/retry`

Command invariants:

- owner-only access
- idempotent command handling keyed by `commandId` (or request hash)
- rejected commands emit `run.message` with `WARN` and return validation errors

## Ownership, visibility, and resume/retry semantics

- Sessions, runs, events, tool calls, and artifact refs are private and user-owned.
- Event stream reads enforce same ownership checks as run/session endpoints.
- `resume` and `retry` continue current behavior:
  - `resume`: source run status must be `PENDING` or `FAILED`
  - `retry`: source run status must be `FAILED` or `CANCELLED`
- Human-input continuation from `WAITING_FOR_INPUT` is in-run continuation, not a new run id.

## Persistence boundaries

Persist in execution data model:

- `WorkflowRun` for run-level state/timestamps/summary/error
- `RunToolCall` for concrete tool invocation records
- `RunArtifactRef` for durable artifact links
- `RunEvent` for runtime event stream

Do not persist in v1 runtime:

- freeform full transcript with token-level provider logs
- cross-run speculative branches
- billing/accounting details

## Migration intent for `#128`

1. Add `RunEvent` persistence with `(runId, sequence)` unique index and JSON payload storage.
2. Add explicit waiting-for-input representation in persisted run state (new enum value or equivalent dedicated field).
3. Add run command handling endpoint and idempotency key support.
4. Keep existing `WorkflowRun`, `RunToolCall`, and `RunArtifactRef` contracts backward compatible for current API consumers.

## PixInsight processing context model (`#130`)

This section defines the minimum structured context for target-aware and camera-aware orchestration decisions.

### Goals

- Keep context explicit and typed so orchestration decisions are auditable.
- Reuse existing post/integration metadata first, then layer user-supplied context where gaps exist.
- Separate deterministic context derivation from prompt-time reasoning.
- Avoid brittle one-off rules embedded directly in route handlers or ad hoc prompts.

### ProcessingContextV1 envelope

```json
{
  "schemaVersion": "1.0",
  "subject": {
    "subjectType": "POST",
    "subjectId": "post-uuid",
    "postId": "post-uuid",
    "integrationSetId": "set-uuid",
    "targetName": "M31",
    "targetType": "GALAXY",
    "captureDate": "2026-09-14T03:15:00.000Z",
    "bortle": 5
  },
  "acquisition": {
    "cameraProfileId": "camera-qhy268m",
    "camera": {
      "model": "QHY268M",
      "sensorType": "MONO",
      "pixelSizeUm": 3.76,
      "binning": "1x1",
      "gain": 56,
      "offset": 20,
      "temperatureC": -10
    },
    "optics": {
      "telescopeProfileId": "scope-fs60cb",
      "focalLengthMm": 355,
      "apertureMm": 60
    },
    "filters": ["L", "R", "G", "B"],
    "sessionNotes": "thin clouds after 02:00 UTC"
  },
  "dataset": {
    "lightFrameCount": 72,
    "calibrationFrameCounts": {
      "darks": 30,
      "flats": 60,
      "bias": 0
    },
    "totalExposureSeconds": 21600,
    "medianSubExposureSeconds": 300,
    "quality": {
      "fwhmMedian": 3.2,
      "eccentricityMedian": 0.43,
      "rejectionRate": 0.11
    }
  },
  "preferences": {
    "outputIntent": "NATURAL",
    "aggressiveness": "MODERATE",
    "starReductionPreference": "LOW",
    "denoisePreference": "MEDIUM"
  },
  "constraints": {
    "maxRuntimeMinutes": 120,
    "allowLargeIntermediateFiles": true
  },
  "derived": {
    "imageScaleArcsecPerPixel": 2.18,
    "isNarrowbandOnly": false,
    "qualityTier": "GOOD",
    "recommendedWorkflowProfile": "mono-lrgb-general"
  }
}
```

### Field catalog

| Field path | Classification | Source | Notes |
| --- | --- | --- | --- |
| `schemaVersion` | Required | System constant | Resolver emits fixed version string. |
| `subject.subjectType` | Required | `WorkflowSession.subjectType` | Must be `POST` or `INTEGRATION_SET`. |
| `subject.subjectId` | Required | `WorkflowSession.subjectId` | Canonical resource id for runtime context. |
| `subject.postId` | Optional | `WorkflowSession`/`Post` relation | Required when orchestration targets a post. |
| `subject.integrationSetId` | Optional | `WorkflowSession`/`IntegrationSet` relation | Required when orchestration targets an integration set. |
| `subject.targetName` | Optional | `Post.targetName` | Missing values remain null; no fake values. |
| `subject.targetType` | Optional | `Post.targetType` | Existing enum values reused. |
| `subject.captureDate` | Optional | `Post.captureDate` | Existing metadata only. |
| `subject.bortle` | Optional | `Post.bortle` | Existing metadata only. |
| `acquisition.cameraProfileId` | Optional | New user profile selection | Stable key for camera defaults/calibration behavior. |
| `acquisition.camera.model` | Optional | New user-supplied | Needed for camera-aware heuristics. |
| `acquisition.camera.sensorType` | Optional | New user-supplied/profile default | `MONO` or `OSC` primarily drives branching. |
| `acquisition.camera.pixelSizeUm` | Optional | New user-supplied/profile default | Used for image scale derivation. |
| `acquisition.camera.binning` | Optional | New user-supplied | Impacts effective scale and SNR assumptions. |
| `acquisition.camera.gain` | Optional | New user-supplied | Session-specific capture context. |
| `acquisition.camera.offset` | Optional | New user-supplied | Session-specific capture context. |
| `acquisition.camera.temperatureC` | Optional | New user-supplied | Calibration strategy input. |
| `acquisition.optics.telescopeProfileId` | Optional | New user profile selection | Stable key for optics defaults. |
| `acquisition.optics.focalLengthMm` | Optional | New user-supplied/profile default | Used for image scale derivation. |
| `acquisition.optics.apertureMm` | Optional | New user-supplied/profile default | Optional signal for throughput assumptions. |
| `acquisition.filters[]` | Optional | New user-supplied or parsed metadata | Drives narrowband/OSC decisions. |
| `acquisition.sessionNotes` | Optional | Existing `IntegrationSet.notes` + new notes | Freeform operator hints only. |
| `dataset.lightFrameCount` | Required | Derived from uploaded light assets | Must be explicit, including zero. |
| `dataset.calibrationFrameCounts.*` | Optional | Derived from assets + user overrides | Darks/flats/bias can be null/zero. |
| `dataset.totalExposureSeconds` | Optional | Derived from capture metadata | Null when exposure metadata is unavailable. |
| `dataset.medianSubExposureSeconds` | Optional | Derived from capture metadata | Null when unavailable. |
| `dataset.quality.*` | Optional | New stats ingestion pipeline | FWHM/eccentricity/rejection are additive. |
| `preferences.outputIntent` | Required | User preference with default | Default `NATURAL` if not set. |
| `preferences.aggressiveness` | Required | User preference with default | Default `MODERATE` if not set. |
| `preferences.starReductionPreference` | Optional | User preference | Style preference, not a hard gate. |
| `preferences.denoisePreference` | Optional | User preference | Style preference, not a hard gate. |
| `constraints.maxRuntimeMinutes` | Optional | User/runtime policy | Allows orchestration to choose shorter variants. |
| `constraints.allowLargeIntermediateFiles` | Optional | User/runtime policy | Governs storage-heavy branch selection. |
| `derived.imageScaleArcsecPerPixel` | Derived | Resolver formula | `206.265 * pixelSizeUm / focalLengthMm` when inputs exist. |
| `derived.isNarrowbandOnly` | Derived | Resolver from filters | True when all detected filters are narrowband families. |
| `derived.qualityTier` | Derived | Resolver from quality metrics | Deterministic tiering (`LOW`, `MIXED`, `GOOD`). |
| `derived.recommendedWorkflowProfile` | Derived | Resolver | Stable profile key, not freeform prompt text. |

### Source boundaries: existing vs new inputs

Existing metadata reused in v1:

- `Post`: `targetName`, `targetType`, `captureDate`, `bortle`, ownership/visibility.
- `IntegrationSet`: title/notes linkage and uploaded asset collection.
- `Asset`: uploaded files, content type, size, relative path for frame grouping hints.
- `WorkflowSession` + `WorkflowRun`: execution subject and ownership boundary.

New user-supplied processing context needed:

- camera/equipment profile linkage and per-session overrides
- filter/channel declarations when filenames are insufficient
- capture parameter values (gain/offset/binning/temperature)
- processing intent and style preferences
- runtime/storage budget constraints

### How orchestration consumes ProcessingContextV1

Runtime usage contract:

1. Resolve context once at run start from persisted records + user overrides.
2. Compute `derived` block via deterministic resolver functions (no model calls).
3. Select workflow profile/step variants using declarative constraints (e.g. `requires.sensorType = MONO`), not ad hoc branch logic in prompts.
4. Provide a compact context summary + profile ids to orchestrator prompts for tie-breaking and narrative guidance.
5. Emit run events that include context hash/profile ids so operator UI can explain why a branch was chosen.

### Heuristic placement contract

| Where heuristic lives | Use for | Examples | Do not put here |
| --- | --- | --- | --- |
| Workflow definitions | Stable, repeatable execution rules and step structure | `MONO + LRGB` calibration order, mandatory review checkpoints | Per-user stylistic taste |
| User preferences | Long-lived user style and tolerance settings | denoise level, star reduction appetite, color intent | Hard safety gates |
| Reusable equipment profiles | Device defaults and known characteristics | camera read-noise assumptions, gain presets, focal length defaults | Session-only exceptions |
| Orchestrator prompt layer | Soft ranking and explanation when multiple valid options remain | choosing between two valid denoise passes based on quality tier | Core deterministic eligibility rules |

### Follow-up implementation slices

Bounded slices after this modeling work:

1. Context persistence + resolver foundations: add typed storage for ProcessingContextV1 and deterministic derived-field resolver utilities.
2. Intake and profile surfaces: capture user-supplied camera/setup/preferences and map them to workflow subjects.
3. Runtime integration: inject resolved context into orchestrator run startup and enforce declarative workflow/profile constraints.
4. Observability and tests: add context-hash/profile telemetry in run events plus resolver and branch-selection tests.

## Implementation slices

- `#127` - runtime/event schema spec (this doc)
- `#128` - orchestrator execution engine implementation over authored workflow definitions
- `#129` - operator station live updates and run controls
- `#130` - PixInsight processing context model for target-aware and camera-aware orchestration
