# Tasks: Improve Logged-In Posts UX

**Input**: Design documents from `specs/001-improve-gallery-ux/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story. No tests requested in spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: [US1], [US2], [US3] for User Story 1–3
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `apps/web/` (Next.js App Router, components)

---

## Phase 1: Setup

**Purpose**: Verify feature context

- [x] T001 Verify feature branch `001-improve-gallery-ux` and design docs (plan.md, spec.md, research.md) are available

---

## Phase 2: Foundational

**Purpose**: No blocking infrastructure for this UI refactor. Proceed to US1.

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - Clear Posts Landing (Priority: P1) 🎯 MVP

**Goal**: Posts page has exactly one primary title and one subtitle above the card grid.

**Independent Test**: Sign in, open `/gallery`, verify one title and one subtitle at top; no duplicate headings.

### Implementation for User Story 1

- [x] T002 [US1] Consolidate gallery page header to single title and subtitle in apps/web/app/gallery/page.tsx: remove "Community" h2 and its subtitle; keep one h1 ("Posts") and one supporting paragraph
- [x] T003 [US1] Update page metadata (title, description) from "Gallery" to "Posts" in apps/web/app/gallery/page.tsx

---

## Phase 4: User Story 2 - Scan and Open Posts Quickly (Priority: P2)

**Goal**: Post cards remain in a grid; each card is identifiable and clickable. Terminology "Gallery" → "Posts" applied.

**Independent Test**: Sign in, open `/gallery`, verify post cards render and link to post detail; nav and page labels say "Posts".

### Implementation for User Story 2

- [x] T004 [P] [US2] Rename nav link "Gallery" to "Posts" in apps/web/src/components/site-header.tsx
- [x] T005 [P] [US2] Rename "Browse Gallery" to "Browse Posts" in apps/web/app/page.tsx
- [x] T006 [P] [US2] Rename "Back to Gallery" to "Back to Posts" in apps/web/app/posts/[slug]/page.tsx
- [x] T007 [US2] Verify post card grid and links in apps/web/app/gallery/page.tsx meet FR-004–FR-007 (no code change if already compliant)

---

## Phase 5: User Story 3 - Predictable States (Priority: P3)

**Goal**: Empty state and loading state show clear messaging.

**Independent Test**: With no posts, open `/gallery` and verify empty-state message and next-step action; verify loading behavior if applicable.

### Implementation for User Story 3

- [x] T008 [US3] Verify empty-state message and "Sign in to get started" CTA in apps/web/app/gallery/page.tsx (no change if already compliant)
- [x] T009 [US3] Add or verify loading/skeleton state for Posts page in apps/web/app/gallery/page.tsx (Next.js Suspense or loading.tsx if needed)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final validation

- [x] T010 [P] Update docs/PRODUCT.md §3.5: change "Gallery" to "Posts" in top-level navigation description
- [ ] T011 Run quickstart.md validation (manual verification per specs/001-improve-gallery-ux/quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: N/A
- **User Story 1 (Phase 3)**: After Setup
- **User Story 2 (Phase 4)**: After US1 (terminology rename builds on header)
- **User Story 3 (Phase 5)**: After US1
- **Polish (Phase 6)**: After US1–US3

### User Story Dependencies

- **US1**: No dependencies; can start after Setup
- **US2**: Shares page with US1; rename tasks can run in parallel after US1 header is done
- **US3**: Independent; can run in parallel with US2

### Parallel Opportunities

- T004, T005, T006 can run in parallel (different files)
- T010 can run in parallel with other polish work

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001 → T002 → T003
2. Validate: one title, one subtitle, metadata updated
3. Deploy/demo

### Incremental Delivery

1. US1 → Test → Deploy (MVP)
2. US2 (terminology) → Test → Deploy
3. US3 (states) → Test → Deploy
4. Polish → Docs + quickstart validation

---

## Notes

- Route `/gallery` unchanged per clarification
- No new API or schema changes
- PostCard component unchanged; grid layout preserved
