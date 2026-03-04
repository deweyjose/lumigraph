# Implementation Plan: Fix Auth Home Routing CTA

**Branch**: `001-fix-auth-home-routing` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fix-auth-home-routing/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Fix the bug where logged-in users clicking the Lumigraph icon land on the home page and see a "Get Started" CTA that routes them to sign-in. Redirect logged-in users from `/` to `/gallery` (authenticated home experience). Logged-out users retain the current "Get Started" onboarding flow. Server-side session check in home page; no new API or schema changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), Auth.js v5, React
**Storage**: N/A (session from Auth.js JWT; no DB changes)
**Testing**: Vitest (if route logic extracted), manual verification per quickstart.md
**Target Platform**: Web (browser)
**Project Type**: web-service (Next.js monorepo)
**Performance Goals**: Standard page load; redirect adds minimal latency
**Constraints**: No regression to logged-out "Get Started" flow; session resolved before render
**Scale/Scope**: Single page change; ~1 file (apps/web/app/page.tsx)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Service-Layer Architecture | ✓ PASS | No new route handlers. Home page uses `auth()` (Auth.js) and `redirect()` (Next.js). No business logic. |
| II. Validation at Boundaries | ✓ PASS | No new API endpoints. |
| III. Strict TypeScript & Code Quality | ✓ PASS | Simple conditional redirect. Lint/typecheck required. |
| IV. Documentation Discipline | ✓ PASS | docs/PRODUCT.md or docs/ARCHITECTURE.md updated if home routing behavior is documented. |
| V. Incremental Delivery | ✓ PASS | Single-file change; minimal scope. |

**Post-Phase 1**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-auth-home-routing/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── home-page-routing.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   └── page.tsx         # Home page: auth() + redirect if session, else current landing
├── auth.ts              # auth() export (existing)
└── ...
```

**Structure Decision**: Lumigraph uses monorepo layout. This feature touches `apps/web/app/page.tsx` only. Add `auth()` call and `redirect()` from `next/navigation` when session exists.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Table not applicable.
