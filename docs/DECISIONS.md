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

### 2026-03-10 - Remove generic workflow and orchestration product direction

- Decision: Remove the workflow-definition, workflow-run, and orchestration feature stack from Lumigraph and refocus the product on Astro Hub, posts, drafts, and integration sets.
- Context: The workflow work was built from an early misunderstanding of a lighter todo/checklist need. It introduced durable authoring and execution abstractions that do not match the intended product.
- Alternatives considered: Keep the workflow code and stop expanding it; replace the runtime with LangGraph or another framework while preserving the product surface; re-skin workflows as checklists without removing the underlying model.
- Consequences: Workflow pages, APIs, services, schema, and roadmap lanes are removed. Future checklist/task support, if added, should attach directly to posts or integration sets rather than introducing a generic workflow engine.

### 2026-03-17 - Keep Auth.js as the session/OAuth base and narrow custom auth work to email/password hardening

- Decision: Keep Auth.js / NextAuth as the current auth foundation, preserve support for credentials, OAuth, and optional email-link flows, and focus near-term work on making the current surface explicit, activating transactional email, and hardening reset/account lifecycle behavior rather than replacing the stack.
- Context: The repo already has a functional Prisma-backed Auth.js integration, custom credentials registration, Argon2 password hashing, and password-reset token handling. The biggest current risk is ambiguity: some auth paths are available only when env is configured, and the implementation blends standard Auth.js behavior with a small amount of custom password logic.
- Alternatives considered: Replace the stack immediately with another auth product; remove password auth and keep OAuth-only; expand bespoke auth code before documenting the current boundary.
- Consequences: Near-term auth work should stay incremental and standards-aligned. Issue #160 documents the current model, #161 activates transactional email for currently dormant email paths, and #162 hardens reset/account lifecycle behavior against OWASP guidance. Larger auth-stack replacement work should not start until this narrower path proves insufficient.

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
