# Tasks: Fix Auth Home Routing CTA

**Input**: Design documents from `specs/001-fix-auth-home-routing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story. No tests requested in spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: [US1], [US2], [US3] for User Story 1–3
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `apps/web/` (Next.js App Router)

---

## Phase 1: Setup

**Purpose**: Verify feature context

- [x] T001 Verify feature branch `001-fix-auth-home-routing` and design docs (plan.md, spec.md, research.md, contracts/) are available

---

## Phase 2: Foundational

**Purpose**: No blocking infrastructure; auth and home page already exist.

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - Logged-In Home Experience (Priority: P1) 🎯 MVP

**Goal**: Logged-in users clicking the Lumigraph icon land on authenticated home (/gallery) and never see "Get Started" CTA.

**Independent Test**: Sign in, click Lumigraph icon from any page; verify redirect to /gallery and no "Get Started" button.

### Implementation for User Story 1

- [x] T002 [US1] Add `auth()` call and redirect to `/gallery` when session exists in apps/web/app/page.tsx (import `auth` from `auth`, `redirect` from `next/navigation`; call `auth()` at top of component; if session, `redirect('/gallery')` before render)

---

## Phase 4: User Story 2 - Logged-Out Home Experience Preserved (Priority: P2)

**Goal**: Logged-out users still see "Get Started" and can reach sign-in. No regression.

**Independent Test**: Sign out, open `/`; verify "Get Started" visible and routes to sign-in.

### Implementation for User Story 2

- [x] T003 [US2] Verify logged-out flow: when `auth()` returns null, current landing page renders with "Get Started" (no code change if T002 conditional is correct; validate per quickstart.md §3)

---

## Phase 5: User Story 3 - Session-Accurate Navigation (Priority: P3)

**Goal**: Navigation behavior matches session state after refresh and across pages.

**Independent Test**: Sign in/sign out, reload, click Lumigraph icon; behavior matches current session.

### Implementation for User Story 3

- [x] T004 [US3] Verify session-accurate behavior: server-side `auth()` resolves before render, so no conflicting CTAs (validate per quickstart.md §4)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final validation

- [x] T005 [P] Add home routing behavior to docs/PRODUCT.md: logged-in users visiting `/` are redirected to `/gallery`; logged-out users see landing with "Get Started"
- [ ] T006 Run quickstart.md validation (manual verification per specs/001-fix-auth-home-routing/quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: N/A
- **User Story 1 (Phase 3)**: After Setup
- **User Story 2 (Phase 4)**: After US1 (verification only)
- **User Story 3 (Phase 5)**: After US1 (verification only)
- **Polish (Phase 6)**: After US1–US3

### User Story Dependencies

- **US1**: No dependencies; can start after Setup
- **US2**: Satisfied by US1 implementation (redirect only when session); verification task
- **US3**: Satisfied by US1 implementation (server-side auth); verification task

### Parallel Opportunities

- T005 can run in parallel with T006 after implementation complete

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001 → T002
2. Validate: sign in, click Lumigraph icon → verify redirect, no "Get Started"
3. Deploy/demo

### Incremental Delivery

1. US1 → Test → Deploy (MVP)
2. US2 (verify) → US3 (verify) → Polish
3. Docs + quickstart validation

---

## Notes

- Single implementation change: apps/web/app/page.tsx
- No new API, no schema changes
- US2 and US3 are verification tasks; no additional code if T002 is correct
