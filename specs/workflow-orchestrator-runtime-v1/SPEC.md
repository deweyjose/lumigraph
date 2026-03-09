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
- PixInsight domain prompt strategy

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

## Implementation slices

- `#127` - runtime/event schema spec (this doc)
- `#128` - orchestrator execution engine implementation over authored workflow definitions
- `#129` - operator station live updates and run controls
