# Implementation Plan: Improve Logged-In Posts UX

**Branch**: `001-improve-gallery-ux` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-improve-gallery-ux/spec.md`

## Summary

Simplify the Posts page (currently `/gallery`) to a single bold title and subtitle, followed by a grid of post cards. Rename user-facing "Gallery" terminology to "Posts" across nav, page header, and cross-links. Route `/gallery` remains unchanged. No API or schema changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React, Auth.js v5, Prisma, Zod
**Storage**: PostgreSQL (existing); no schema changes for this feature
**Testing**: Vitest (unit), Playwright (E2E deferred)
**Target Platform**: Web (desktop, tablet, mobile)
**Project Type**: Web application (Next.js monorepo)
**Performance Goals**: Standard web; no new performance targets
**Constraints**: Service-layer architecture; no business logic in route handlers
**Scale/Scope**: Single page refactor + terminology rename across ~6 files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Service-Layer Architecture | PASS | No new routes; page reads from existing `listPublicPosts` service |
| II. Validation at Boundaries | PASS | No new API endpoints |
| III. Strict TypeScript & Code Quality | PASS | Types, lint must pass |
| IV. Documentation Discipline | PASS | Update docs/PRODUCT.md §3.5 (Gallery → Posts) |
| V. Incremental Delivery | PASS | Single page + nav/link renames; minimal scope |

## Project Structure

### Documentation (this feature)

```text
specs/001-improve-gallery-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal; no new entities)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (UI structure)
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   ├── gallery/page.tsx       # Posts page; consolidate header, rename copy
│   ├── page.tsx               # Home: "Browse Gallery" → "Browse Posts"
│   └── posts/[slug]/page.tsx  # "Back to Gallery" → "Back to Posts"
├── src/
│   └── components/
│       ├── site-header.tsx     # Nav: "Gallery" → "Posts"
│       └── posts/new-post-form.tsx  # Cancel link: /gallery (route unchanged)
```

**Structure Decision**: Monorepo layout per docs. All changes in `apps/web/`. No new directories.
