# Tasks: Home Astro Hub and Navigation UX

**Input**: Design documents from `specs/001-home-astro-hub/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add dependencies and environment configuration

- [x] T001 [P] Add `openai` package to apps/web/package.json
- [x] T002 [P] Add OPENAI_API_KEY and NASA_API_KEY to apps/web/.env.example
- [x] T003 Create apps/web/src/components/home/ directory for home-specific components

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Auth-aware routing, splash, header, and DailyCanvas schema. Delivers US2 and US3.

**Independent Test**: Sign out → see splash with "Browse Posts" only (no login in main). Sign in → see astro hub placeholder. Header has exactly one login when logged out.

- [x] T004 Add DailyCanvas model to prisma/schema.prisma and create migration
- [x] T005 [P] [US2] Create SplashContent component (hero, feature cards, "Browse Posts" only; no login button) in apps/web/src/components/home/splash-content.tsx
- [x] T006 [US2] Remove "Get Started" button from splash; keep only "Browse Posts" per contracts/home-page-ui.md
- [x] T007 [US3] Audit apps/web/src/components/site-header.tsx and apps/web/src/components/user-nav.tsx; ensure exactly one login entry when logged out
- [x] T008 [P] Create AstroHub skeleton component (placeholder for daily canvas + chatbot slot) in apps/web/src/components/home/astro-hub.tsx
- [x] T009 Refactor apps/web/app/page.tsx to be auth-aware: call auth(), render SplashContent when logged out, AstroHub when logged in
- [x] T010 Verify nav links: Lumigraph → /, Posts → /gallery in apps/web/src/components/site-header.tsx

**Checkpoint**: Splash (no login in main), header (single login), auth-aware page. US2 and US3 complete.

---

## Phase 3: User Story 1 - Logged-In Home as Astro Content Hub (Priority: P1) 🎯 MVP

**Goal**: Logged-in users see daily astrophotography content (events, calendar, highlights) from NASA/Open Notify/SpaceX + OpenAI synthesis.

**Independent Test**: Sign in, click Lumigraph icon → land on / with daily canvas content (not posts gallery). Click Posts → /gallery.

- [x] T011 [P] [US1] Implement external API fetchers (NASA APOD, Open Notify ISS, SpaceX latest) in apps/web/src/server/services/external-apis.ts
- [x] T012 [P] [US1] Implement DailyCanvas repository (findDailyCanvas, createDailyCanvas) in apps/web/src/server/repo/daily-canvas.ts
- [x] T013 [US1] Implement getOrGenerateDailyCanvas service (fetch APIs, call OpenAI, cache in DB, fallbacks) in apps/web/src/server/services/daily-canvas.ts
- [x] T014 [US1] Define Zod schema for daily canvas content shape (events, calendar, highlights) in apps/web/src/server/services/daily-canvas.ts
- [x] T015 [US1] Create DailyCanvas component to render synthesized content in apps/web/src/components/home/daily-canvas.tsx
- [x] T016 [US1] Wire AstroHub to call getOrGenerateDailyCanvas and render DailyCanvas in apps/web/src/components/home/astro-hub.tsx
- [x] T017 [US1] Add loading and error fallback states (cached prior day, static placeholder) per research.md §8

**Checkpoint**: User Story 1 complete. Logged-in home shows daily astro content.

---

## Phase 4: User Story 2 - Logged-Out Splash and Posts Toggle (Priority: P2)

**Goal**: Logged-out users toggle between splash and posts via Lumigraph and Posts links. No duplicate login.

**Independent Test**: Sign out, click Lumigraph → splash. Click Posts → /gallery. Click Lumigraph → splash. Single login in header.

- [x] T018 [US2] Verify SplashContent has no login button; run quickstart manual verification for splash
- [x] T019 [US2] Verify Lumigraph/Posts toggle behavior per specs/001-home-astro-hub/quickstart.md §2

**Checkpoint**: US2 verified. (Most work done in Phase 2.)

---

## Phase 5: User Story 3 - Single Login Entry (Priority: P3)

**Goal**: At most one login control in upper-right header.

**Independent Test**: Logged out, inspect header → exactly one login entry.

- [x] T020 [US3] Verify UserNav is sole login entry; remove any duplicate sign-in CTAs from layout or other components

**Checkpoint**: US3 verified.

---

## Phase 6: User Story 4 - Astrophotography AI Chatbot (Priority: P4)

**Goal**: Logged-in users interact with floating chatbot (bottom-right; expandable) for astrophotography/astronomy questions.

**Independent Test**: Sign in, open home → floating chatbot visible. Send message → AI response. Follow-up → context maintained. Logged out → chatbot not shown.

- [x] T021 [P] [US4] Implement chat service (OpenAI streaming, system prompt for astro assistant) in apps/web/src/server/services/chat.ts
- [x] T022 [US4] Create POST /api/chat route with Zod validation, auth check, streaming response in apps/web/app/api/chat/route.ts
- [x] T023 [US4] Create ChatWidget component (floating bottom-right, expandable/collapsible, streaming) in apps/web/src/components/home/chat-widget.tsx
- [x] T024 [US4] Integrate ChatWidget into AstroHub; render only when session exists in apps/web/src/components/home/astro-hub.tsx
- [x] T025 [US4] Add error/retry UI when chatbot unavailable or rate-limited per spec edge cases

**Checkpoint**: User Story 4 complete. Full astro hub with daily canvas + chatbot.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and validation

- [x] T026 [P] Update docs/PRODUCT.md §3.5 (top-level navigation: home vs posts, splash behavior)
- [x] T027 [P] Update docs/ARCHITECTURE.md with OpenAI usage, external APIs (NASA, Open Notify, SpaceX), daily canvas flow
- [ ] T028 Run quickstart.md manual verification; fix any regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2 (verification)
- **Phase 5 (US3)**: Depends on Phase 2 (verification)
- **Phase 6 (US4)**: Depends on Phase 3 (AstroHub exists)
- **Phase 7 (Polish)**: Depends on Phases 3–6

### User Story Dependencies

- **US1 (P1)**: After Phase 2. No dependency on US2/US3/US4.
- **US2 (P2)**: Delivered in Phase 2; Phase 4 is verification.
- **US3 (P3)**: Delivered in Phase 2; Phase 5 is verification.
- **US4 (P4)**: After US1 (needs AstroHub to host ChatWidget).

### Parallel Opportunities

- T001, T002, T003 (Phase 1) can run in parallel
- T005, T007, T008 (Phase 2) can run in parallel
- T011, T012 (Phase 3) can run in parallel
- T021 (Phase 6) can start once T016 is done (chat service independent of canvas)
- T026, T027 (Phase 7) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (splash, header, auth-aware page, migration)
3. Phase 3: US1 (daily canvas)
4. **STOP and VALIDATE**: Sign in → see astro hub with daily content
5. Deploy/demo

### Incremental Delivery

1. Setup + Foundational → Splash and header ready
2. US1 → Daily canvas on home → MVP
3. US2/US3 → Verify splash and single login
4. US4 → Add chatbot
5. Polish → Docs and quickstart validation

### Parallel Team Strategy

- After Phase 2: Developer A does US1 (canvas), Developer B can prep US4 (chat service)
- US4 depends on AstroHub existing (T016) but chat service (T021) can be built in parallel

---

## Notes

- [P] tasks = different files, no dependencies
- Tests not explicitly requested in spec; add integration tests for daily-canvas and chat services if desired
- Commit after each task or logical group
- OPENAI_API_KEY required for US1 and US4; NASA_API_KEY optional (improves rate limit)
