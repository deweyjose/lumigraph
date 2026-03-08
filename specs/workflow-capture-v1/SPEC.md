# Workflow Capture V1

## Purpose

Workflow capture v1 defines reusable, user-authored workflow templates that can later be attached to workflow sessions and runs.

This spec covers:

- the authored workflow-definition model
- the ordered step model
- private-first ownership and visibility rules
- the intended v1 API contract shape

This spec does not cover:

- cloud execution orchestration
- public/shared workflow galleries
- branching, loops, or arbitrary expressions

## Goals

- Let a user save a reusable workflow for a repeatable process.
- Keep the model narrow enough to support a simple private editor UI.
- Align step definitions with the existing typed tool surface from `#97`.
- Keep authored definitions separate from runtime execution records from `#104`, `#105`, and `#103`.

## V1 principles

- Private-first: workflow definitions are owned by one user and are not public.
- Linear: steps are an ordered list with no branching or conditional paths.
- Explicit: tool steps reference known tool names instead of hiding behavior in prose.
- Replaceable: the full ordered step list can be updated as one definition payload in v1.
- Compatible: definitions should be able to target the same resource types already used by workflow sessions.

## Definitions

### WorkflowDefinition

Logical fields:

- `id: UUID`
- `userId: UUID`
- `title: string`
- `description: string | null`
- `subjectType: "POST" | "INTEGRATION_SET" | null`
- `status: "DRAFT" | "ACTIVE" | "ARCHIVED"`
- `createdAt: datetime`
- `updatedAt: datetime`

Behavior:

- `subjectType` describes what kind of owned resource the workflow can be launched against.
- `null` `subjectType` means the workflow is generic and not restricted to one current subject type.
- `DRAFT` definitions are editable but not intended for launch.
- `ACTIVE` definitions are editable and launchable in v1.
- `ARCHIVED` definitions remain readable but should not be offered for new launches.

### WorkflowStepDefinition

Logical fields:

- `id: UUID`
- `definitionId: UUID`
- `key: string`
- `position: integer`
- `title: string`
- `kind: "INSTRUCTION" | "TOOL_CALL" | "REVIEW"`
- `instructions: string | null`
- `toolName: string | null`
- `toolInputTemplateJson: json | null`
- `expectedArtifactType: "POST" | "INTEGRATION_SET" | "ASSET" | "DOWNLOAD_JOB" | null`
- `createdAt: datetime`
- `updatedAt: datetime`

Behavior:

- `position` is 1-based and must be contiguous within a definition.
- `key` is stable within a definition and intended for future execution/routing references.
- `INSTRUCTION` is descriptive guidance only and must not set `toolName`.
- `TOOL_CALL` references one existing Lumigraph tool name and may include a JSON input template.
- `REVIEW` is a human checkpoint or validation gate and must not set `toolName`.
- `expectedArtifactType` is optional metadata that hints at the durable output a step is expected to create or touch.

## V1 invariants

- Definitions and steps are user-owned records.
- Reads and writes must enforce ownership server-side.
- Steps are always returned in ascending `position` order.
- A definition must contain at least one step to become `ACTIVE`.
- `TOOL_CALL` steps must reference a tool name from the current typed tool registry.
- `INSTRUCTION` and `REVIEW` steps must not carry `toolName`.
- V1 does not support nested steps, branching, loops, conditions, or freeform code.

## Relationship to runtime execution

- `WorkflowDefinition` is the reusable template.
- `WorkflowSession` is one user-owned execution thread and may reference a definition.
- `WorkflowRun` is one execution attempt within that session.
- `RunToolCall` stores actual runtime tool invocations.
- `RunArtifactRef` stores actual durable outputs linked to a run.

Authoring and runtime are intentionally separate:

- definitions describe intended process
- runs record actual behavior

## Private API contract

V1 should prefer a simple whole-definition update model over many granular step endpoints.

### List definitions

`GET /api/workflow-definitions`

Response:

```json
{
  "definitions": [
    {
      "id": "uuid",
      "title": "Process final image delivery",
      "description": "Prepare, verify, and publish a completed post.",
      "subjectType": "POST",
      "status": "ACTIVE",
      "stepCount": 4,
      "createdAt": "2026-03-08T17:00:00.000Z",
      "updatedAt": "2026-03-08T17:00:00.000Z"
    }
  ]
}
```

### Fetch one definition

`GET /api/workflow-definitions/:id`

Response:

```json
{
  "definition": {
    "id": "uuid",
    "title": "Process final image delivery",
    "description": "Prepare, verify, and publish a completed post.",
    "subjectType": "POST",
    "status": "ACTIVE",
    "steps": [
      {
        "id": "uuid",
        "key": "review-assets",
        "position": 1,
        "title": "Review final assets",
        "kind": "REVIEW",
        "instructions": "Confirm both final image assets are uploaded.",
        "toolName": null,
        "toolInputTemplateJson": null,
        "expectedArtifactType": "ASSET"
      }
    ],
    "createdAt": "2026-03-08T17:00:00.000Z",
    "updatedAt": "2026-03-08T17:00:00.000Z"
  }
}
```

### Create definition

`POST /api/workflow-definitions`

Request:

```json
{
  "title": "Publish post checklist",
  "description": "Verify assets, review metadata, and publish.",
  "subjectType": "POST",
  "status": "DRAFT",
  "steps": [
    {
      "key": "review-assets",
      "position": 1,
      "title": "Review final assets",
      "kind": "REVIEW",
      "instructions": "Confirm both final image assets are uploaded.",
      "toolName": null,
      "toolInputTemplateJson": null,
      "expectedArtifactType": "ASSET"
    },
    {
      "key": "publish-post",
      "position": 2,
      "title": "Publish the post",
      "kind": "TOOL_CALL",
      "instructions": "Publish when metadata is ready.",
      "toolName": "posts.publish",
      "toolInputTemplateJson": {
        "postId": "{{subject.id}}"
      },
      "expectedArtifactType": "POST"
    }
  ]
}
```

Response:

- `201 Created`
- body shape matches `GET /api/workflow-definitions/:id`

### Update definition

`PUT /api/workflow-definitions/:id`

Request:

- same shape as create
- semantics are replace-in-place for mutable fields and the full ordered step list

Response:

- `200 OK`
- body shape matches `GET /api/workflow-definitions/:id`

### Error contract

Workflow-definition routes should follow the current API conventions:

- `401` -> `{ code: "UNAUTHORIZED", message }`
- `400` -> `{ code: "VALIDATION_ERROR", message }`
- `404` -> `{ code: "NOT_FOUND", message }`
- `409` -> route-specific conflict codes when uniqueness or invalid transitions matter

## UI expectations for v1

The first editor should support:

- list owned definitions
- create a definition
- edit title, description, subject type, and status
- add, remove, and reorder steps
- choose step kind
- set tool name only for `TOOL_CALL` steps

The first editor does not need:

- drag-and-drop polish
- collaborative editing
- branching visualization

## Deferred work

Out of scope for v1:

- shared/public workflow visibility
- conditional or branching steps
- nested workflows
- version history or rollback
- transcript capture inside the definition model
- background orchestration or scheduling

## Implementation slices

- `#116` - Spec workflow capture v1 domain model and API contract
- `#117` - Persist workflow definitions and ordered step definitions
- `#118` - Add private workflow definition CRUD APIs
- `#119` - Build workflow capture v1 list and editor UX
- `#120` - Launch workflow sessions from authored definitions
