<!--
Sync Impact Report
==================
Version change: (none) → 1.0.0
Modified principles: N/A (initial fill from template)
Added sections: All sections filled from Lumigraph docs
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ Constitution Check gates align (service-layer, validation, TypeScript, docs, increments)
  - .specify/templates/spec-template.md: ✅ Scope/requirements align (no new mandatory sections)
  - .specify/templates/tasks-template.md: ✅ Task types align (validation, testing, docs)
  - .cursor/commands/speckit.*.md: ✅ No constitution-specific references to update
  - docs/: No direct constitution references; AI_CONTEXT.md already points to canonical docs
Follow-up TODOs: None
-->

# Lumigraph Constitution

## Core Principles

### I. Service-Layer Architecture (NON-NEGOTIABLE)

Route handlers MUST NOT contain business logic. They MUST validate input, call service modules, and return responses. Services in `apps/web/src/server/services/` own domain logic (ownership checks, visibility rules). Repositories in `apps/web/src/server/repo/` perform all Prisma/database access. No business logic in route handlers or repositories.

**Rationale**: Clear separation of concerns, testability, and maintainability. Enables unit testing of services without HTTP.

### II. Validation at Boundaries

Every API endpoint MUST validate request bodies and params with Zod. Parse/validate at the boundary, then pass typed objects inward. No skipping validation at API boundaries.

**Rationale**: Security, correctness, and predictable failure modes. Invalid input must never reach service logic.

### III. Strict TypeScript & Code Quality

TypeScript strict mode everywhere. Lint MUST pass. Type errors are not allowed. Avoid magic strings; use enums/constants. Prefer clear, boring patterns over cleverness.

**Rationale**: Catch errors at compile time. Maintainability and consistency across the codebase.

### IV. Documentation Discipline

When changing domain entities, API routes, database schema, visibility rules, auth behavior, or storage layout (S3 keys): update docs/PRODUCT.md, docs/ARCHITECTURE.md, and docs/DECISIONS.md as appropriate. Documentation is part of the definition of done.

**Rationale**: AI tools and humans rely on canonical docs. Stale docs cause incorrect implementations.

### V. Incremental Delivery

Small increments over large refactors. Implement minimal, testable increments. Prefer correctness and clarity over speed. Do not introduce new abstractions unless necessary. Do not refactor unrelated areas unless explicitly requested.

**Rationale**: Lower risk, easier review, faster feedback. Reduces merge conflicts and regression surface.

## Additional Constraints

- **Schema**: No silent schema changes. All migrations must be version-controlled and applied via the documented pipeline.
- **Secrets**: No committing secrets or hardcoding environment values.
- **Architecture**: Avoid premature microservices. Prefer boring tech; optimize for maintainability.
- **Package manager**: Use pnpm for all operations. Do not introduce npm or yarn.
- **Structure**: Monorepo layout—`apps/web`, `packages/*`, `docs/*`, `prisma/*`. Do not introduce new top-level directories without updating docs/DECISIONS.md.

## Development Workflow

- **Issues**: Every PR MUST be tied to a GitHub issue. Start work by selecting an issue and linking it in the PR.
- **Branch naming**: `feature/<issue-id>`, `bug/<issue-id>`, `infrastructure/<issue-id>`, or `docs/<issue-id>`.
- **PR description**: MUST include Intent, Change, Why, Behavior, and `Fixed #<issue>` or `Closes #<issue>`.
- **Definition of done**: Acceptance criteria met, types pass (tsc), lint passes, migrations applied cleanly, basic tests pass, docs updated when applicable.

## Governance

This constitution supersedes conflicting practices. Amendments require documentation, approval, and (for non-trivial changes) a migration plan. All PRs and reviews MUST verify compliance with these principles. Complexity must be justified. Use docs/AI_CONTEXT.md, docs/PRODUCT.md, docs/ARCHITECTURE.md, and docs/ENGINEERING.md for runtime development guidance.

**Version**: 1.0.0 | **Ratified**: 2026-03-03 | **Last Amended**: 2026-03-03
