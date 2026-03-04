# Implementation Plan: Fix Final Image Upload File Size Limit

**Branch**: `001-fix-final-image-upload-size` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/001-fix-final-image-upload-size/spec.md`

## Summary

Fix the bug where users see "file too big" when uploading final images or dataset artifacts. The system currently enforces a configurable max size (default 500MB) via `ARTIFACT_MAX_SIZE_BYTES`. The fix: (1) increase the default to 1GB to support typical astrophotography workflows, (2) improve the error message to include the limit and suggest next steps, (3) ensure configuration remains via env. No schema or infrastructure changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: Next.js 16, Zod, Prisma, AWS SDK (S3)  
**Storage**: PostgreSQL (metadata), S3 (files)  
**Testing**: Vitest (unit + integration), LocalStack for S3  
**Target Platform**: Web (Next.js App Router), Vercel deployment  
**Project Type**: Web application (monorepo: apps/web, packages/*)  
**Performance Goals**: Presign response < 500ms; size validation before upload (no long upload then fail)  
**Constraints**: Presigned PUT flow (client → S3 direct); validation at presign step only  
**Scale/Scope**: Single API route change; artifact service; env config

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Service-Layer Architecture | ✅ PASS | Validation in route; `getMaxArtifactSizeBytes` in service; no logic in handler |
| II. Validation at Boundaries | ✅ PASS | Zod schema at presign route; size validated before service call |
| III. Strict TypeScript & Code Quality | ✅ PASS | No new dependencies; existing patterns |
| IV. Documentation Discipline | ✅ PASS | Update docs/ARCHITECTURE.md (max size), .env.example (default) |
| V. Incremental Delivery | ✅ PASS | Minimal change: default + error message + docs |

No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-final-image-upload-size/
├── plan.md              # This file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output (minimal)
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output (presign API)
└── tasks.md              # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/web/
├── app/api/datasets/[id]/artifacts/
│   └── presign/route.ts       # Validation + error message
├── src/server/services/
│   └── artifact.ts            # getMaxArtifactSizeBytes default
└── src/components/datasets/
    └── dataset-artifact-upload.tsx   # Displays error (no change if API returns message)

packages/db/                    # No change
prisma/                         # No schema change
```

**Structure Decision**: Lumigraph monorepo. Change confined to `apps/web`. No new directories.

## Complexity Tracking

> No Constitution violations. Table left empty.
