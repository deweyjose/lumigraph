# Implementation Plan: Home Astro Hub and Navigation UX

**Branch**: `001-home-astro-hub` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-home-astro-hub/spec.md`

## Summary

Differentiate home (`/`) from posts (`/gallery`): logged-in users see an astrophotography content hub (daily canvas from NASA/Open Notify/SpaceX APIs + OpenAI synthesis, plus AI chatbot); logged-out users see a splash screen without login button in main content. Single login in header. Lumigraph icon → home; Posts → gallery.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16 (App Router), React, Auth.js v5, Prisma, Zod, OpenAI SDK
**Storage**: PostgreSQL (existing + new `daily_canvas` table)
**Testing**: Vitest (unit), integration tests for services
**Target Platform**: Web (desktop, tablet, mobile)
**Project Type**: Web application (Next.js monorepo)
**Performance Goals**: Daily canvas cached; chatbot streaming for perceived latency
**Constraints**: Service-layer architecture; no business logic in route handlers; Zod at boundaries
**Scale/Scope**: ~15–20 files; new services (canvas, chat, external APIs); one schema migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Service-Layer Architecture | PASS | Route handlers validate, call services; services own canvas/chat logic |
| II. Validation at Boundaries | PASS | Zod for chat API body; validate at API boundary |
| III. Strict TypeScript & Code Quality | PASS | Types, lint must pass |
| IV. Documentation Discipline | PASS | Update docs/PRODUCT.md §3.5, ARCHITECTURE.md (APIs, OpenAI) |
| V. Incremental Delivery | PASS | Phased: nav/splash first, then canvas, then chatbot |

## Project Structure

### Documentation (this feature)

```text
specs/001-home-astro-hub/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── home-page-ui.md
│   ├── daily-canvas-api.md
│   └── chatbot-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   ├── page.tsx                    # Auth-aware: splash vs astro hub
│   └── api/
│       └── chat/route.ts           # POST /api/chat (streaming, auth required)
├── src/
│   ├── server/
│   │   ├── services/
│   │   │   ├── daily-canvas.ts     # getOrGenerateDailyCanvas
│   │   │   ├── external-apis.ts   # fetch NASA, Open Notify, SpaceX
│   │   │   └── chat.ts            # OpenAI chat completion (streaming)
│   │   └── repo/
│   │       └── daily-canvas.ts    # findDailyCanvas, createDailyCanvas
│   └── components/
│       ├── home/
│       │   ├── splash-content.tsx  # Logged-out splash (no login button)
│       │   ├── astro-hub.tsx       # Logged-in: canvas + chatbot
│       │   ├── daily-canvas.tsx    # Renders canvas content
│       │   └── chat-widget.tsx     # Floating chatbot (bottom-right; expandable; streaming)
│       └── site-header.tsx         # Ensure single login; nav links
prisma/
├── schema.prisma                   # Add DailyCanvas model
└── migrations/                     # New migration for daily_canvas
```

**Structure Decision**: Monorepo layout per docs. All changes in `apps/web/` and `prisma/`. New `home/` component folder for home-specific UI.

## Complexity Tracking

> No constitution violations requiring justification.
