# Tasks: Fix Final Image Upload File Size Limit

**Input**: Design documents from `specs/001-fix-final-image-upload-size/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story. Single user story (US1) for this bug fix.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: [US1] for User Story 1
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `apps/web/` (Next.js App Router, services, components)

---

## Phase 1: Setup

**Purpose**: Verify feature context

- [x] T001 Verify feature branch `001-fix-final-image-upload-size` and design docs (plan.md, spec.md, research.md) are available

---

## Phase 2: Foundational

**Purpose**: No blocking infrastructure for this fix. Proceed to US1.

**Checkpoint**: Foundation ready

---

## Phase 3: User Story 1 - Upload Large Final Image (Priority: P1) 🎯 MVP

**Goal**: Users can upload files up to 1GB (default) and receive a clear error when exceeding the limit.

**Independent Test**: Upload a file under 1GB → succeeds. Upload a file over limit → clear error with limit stated.

### Implementation for User Story 1

- [x] T002 [US1] Update getMaxArtifactSizeBytes default from 500MB to 1GB (1,073,741,824) in apps/web/src/server/services/artifact.ts
- [x] T003 [US1] Add formatMaxSizeForDisplay(bytes: number): string helper in apps/web/src/server/services/artifact.ts to return human-readable size (e.g. "1 GB", "500 MB")
- [x] T004 [US1] Update presign route to use improved error message including limit and next steps in apps/web/app/api/datasets/[id]/artifacts/presign/route.ts
- [x] T005 [US1] Update .env.example comment for ARTIFACT_MAX_SIZE_BYTES to reflect 1GB default in apps/web/.env.example
- [x] T006 [US1] Update artifact.test.ts: change default assertions from 500MB to 1GB in apps/web/src/server/services/artifact.test.ts
- [x] T007 [US1] Add test for formatMaxSizeForDisplay in apps/web/src/server/services/artifact.test.ts
- [x] T008 [US1] Add presign route test for contentLength exceeding max: expect 400, message includes limit in apps/web/app/api/datasets/[id]/artifacts/presign/route.test.ts

**Checkpoint**: User Story 1 complete. Upload large file succeeds; oversized file returns clear error.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and validation

- [x] T009 [P] Update docs/ARCHITECTURE.md §3 Security Model / Uploads to document 1GB default and ARTIFACT_MAX_SIZE_BYTES
- [x] T010 [P] Run quickstart.md validation (manual upload test under/over limit)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: None for this fix
- **User Story 1 (Phase 3)**: T002→T004 (service before route); T006–T008 (tests) can follow implementation
- **Polish (Phase 4)**: After US1 complete

### Task Dependencies

- T002, T003: Can run in parallel (both in artifact.ts)
- T004: Depends on T002, T003 (uses getMaxArtifactSizeBytes and formatMaxSizeForDisplay)
- T005: Independent
- T006, T007: Depend on T002, T003
- T008: Depends on T004
- T009, T010: Independent of each other

### Parallel Opportunities

- T002 and T003: Same file, sequential (T003 adds helper used by T004)
- T005, T009: [P] — independent docs
- T006, T007: Same file, sequential

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Phase 2: N/A
3. Complete Phase 3: T002–T008
4. **STOP and VALIDATE**: Run `pnpm test`, manual upload test
5. Complete Phase 4: T009, T010

### Suggested Order

1. T001
2. T002, T003 (artifact.ts)
3. T004 (presign route)
4. T005 (.env.example)
5. T006, T007 (artifact tests)
6. T008 (presign test)
7. T009, T010 (docs, validation)

---

## Notes

- No schema or migration changes
- Client (dataset-artifact-upload.tsx) displays `data.message` from API; no change needed
- Existing integration tests use mocked getMaxArtifactSizeBytes; update mock if they assert on size rejection
