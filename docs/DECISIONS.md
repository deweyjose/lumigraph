# Decisions (ADR-lite)

Record architecture and workflow decisions that affect future implementation.

## Template

### YYYY-MM-DD - Title

- Decision:
- Context:
- Alternatives considered:
- Consequences:

---

### 2026-03-08 - Docs and context consolidation

- Decision: Consolidate documentation into a lean core set and move execution state to GitHub Issues.
- Context: Planning and implementation context was duplicated across many files and tool-specific folders.
- Alternatives considered: Keep all existing docs and continue organic growth.
- Consequences: Faster onboarding, lower drift risk, explicit roadmap-to-issue workflow.

### 2026-03-08 - Format-first quality gate

- Decision: Require `pnpm format:fix` and `pnpm format` before type/lint/test for substantial changes.
- Context: Formatting drift caused late-cycle failures.
- Alternatives considered: Run format checks only in CI.
- Consequences: Cleaner local diffs and fewer avoidable CI failures.

### 2026-03-08 - Build agentic capabilities on top of stable contracts

- Decision: Prioritize API contract cleanup, a dedicated AI integration boundary, and typed tool-like server actions before adding more end-user AI features.
- Context: The current prototype already has AI-powered daily canvas and chat, but provider calls and prompt logic are still feature-local. The service/domain split is usable, yet the machine-facing API contract and AI boundary are not stable enough to support broader agent workflows safely.
- Alternatives considered: Continue shipping user-facing AI features first; focus on visual polish before platform cleanup; add workflow persistence before contract normalization.
- Consequences: Near-term work shifts toward backend and docs cleanup, but future AI features can reuse a clearer contract surface, swap providers more safely, and call domain actions through explicit interfaces instead of ad hoc route knowledge.

### 2026-03-08 - Separate workflow definition from execution persistence

- Decision: Treat workflow definition/capture and execution persistence as related but distinct concerns. Workflow capture owns reusable definitions and step templates; execution persistence owns sessions, runs, tool-call audit logs, and artifact references.
- Context: Lumigraph now has stable API contracts, an AI boundary, and typed tool surfaces. The next risk is schema churn from mixing authored workflow templates with runtime state too early.
- Alternatives considered: Put definitions, sessions, runs, and transcripts into one broad execution model; keep runs fully stateless for longer; persist raw chat transcripts first and infer tool history later.
- Consequences: `#92` can progress independently on workflow-definition UX and schema, while execution work can start with private-first session/run persistence that references workflow definitions and tool names without blocking on a full runtime.

### 2026-03-08 - Keep workflow capture v1 private-first and linear

- Decision: Scope workflow capture v1 to private owned workflow definitions with linear ordered steps and no branching.
- Context: Lumigraph now has execution persistence and tool surfaces, but no authored workflow model. The first workflow-capture slice needs to be small enough to implement across schema, APIs, and UI without inventing a full automation language.
- Alternatives considered: Start with shared/public workflows; add conditional branching, loops, or arbitrary expressions in v1; model each step as an unstructured freeform text block with implicit tool semantics.
- Consequences: Workflow capture can ship sooner with simpler APIs and editor UX, while future agent/chat/runtime work can attach to explicit step order and tool names. More advanced orchestration features stay available as follow-up work rather than distorting the initial model.

### 2026-03-08 - Adopt an evented orchestrator runtime contract with explicit human-input pauses

- Decision: Define a canonical orchestrator lifecycle (`QUEUED`, `RUNNING`, `WAITING_FOR_INPUT`, terminal states) and require an append-only per-run event stream as the contract between executor and operator UI.
- Context: Execution persistence exists for sessions, runs, tool calls, and artifact refs, but runtime behavior was still implicit. Without an explicit state machine and run-event schema, `#128` and `#129` risk diverging implementation contracts.
- Alternatives considered: Keep status-only polling without a run-event stream; model human review as freeform chat text without state transitions; defer waiting-for-input semantics until operator UI exists.
- Consequences: The executor and operator station share one runtime/event contract, review gates become explicit and resumable, and migration work can incrementally add waiting-for-input persistence without breaking current run APIs.

### 2026-03-07 - Async ZIP export jobs

- Decision: Use async worker callbacks for integration-set ZIP export progress and completion.
- Context: ZIP generation can be large/long-running and should not block request lifecycle.
- Alternatives considered: Synchronous request/response ZIP generation.
- Consequences: Better scalability and UX progress reporting, with additional callback verification complexity.

### 2026-03-07 - Export deletion should remove storage object

- Decision: Delete export ZIP object server-side when deleting terminal export jobs.
- Context: Users need explicit cleanup, not only TTL expiration.
- Alternatives considered: DB-only delete and rely fully on bucket lifecycle.
- Consequences: Immediate storage cleanup and clearer UX semantics.

### 2026-03-08 - Model PixInsight processing context as a typed resolver-fed envelope

- Decision: Define a typed `ProcessingContextV1` model (required/optional/derived fields) and require deterministic context derivation before orchestrator prompt selection.
- Context: Target-aware and camera-aware orchestration needs stable inputs from post/integration metadata plus new user-supplied capture context. Without a typed envelope, orchestration would rely on brittle prompt-only branching.
- Alternatives considered: Keep all context as freeform prompt text; hard-code camera/target branching in service logic without a shared model; wait for native PixInsight integration before modeling context.
- Consequences: `#128` can consume a stable context contract, workflow/profile heuristics are placed intentionally (definitions, preferences, profiles, prompts), and follow-up implementation slices for intake/persistence/runtime wiring are clearer and bounded.
