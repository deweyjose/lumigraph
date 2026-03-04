# Research: Fix Final Image Upload File Size Limit

**Feature**: 001-fix-final-image-upload-size  
**Date**: 2026-03-03

## 1. Default Maximum File Size

**Decision**: Increase default from 500MB to 1GB (1,073,741,824 bytes).

**Rationale**:
- Spec SC-001 requires "at least 1GB" for default configuration.
- Astrophotography workflows: FITS stacks, zipped calibration sets, and high-res TIFFs commonly exceed 500MB.
- 1GB covers most single-file uploads without requiring env configuration.
- S3 supports objects up to 5TB; 1GB is well within limits.
- Vercel/serverless: presign is JSON-only (no large body); PUT goes client→S3 directly, so no server body limit.

**Alternatives considered**:
- 2GB: More headroom but higher storage cost; can be set via env if needed.
- Keep 500MB: Fails spec; users remain blocked.
- 512MB: Insufficient; still blocks common workflows.

---

## 2. Error Message Format

**Decision**: Return a structured error that includes the maximum allowed size (in human-readable form) and a suggestion.

**Rationale**:
- Spec FR-002: "clear, user-friendly error message that states the limit and suggests next steps."
- Current: "File size exceeds maximum allowed" — no actionable info.
- Proposed: "File size exceeds maximum allowed (limit: 1 GB). Reduce file size or contact support for higher limits."
- When env is set: use actual limit (e.g. "limit: 500 MB") so message stays accurate.

**Alternatives considered**:
- Keep generic message: Fails FR-002.
- Return limit in bytes only: Not user-friendly.
- Separate `maxSizeBytes` in JSON: Client could use it; message still needed for display.

---

## 3. Configuration (ARTIFACT_MAX_SIZE_BYTES)

**Decision**: No change. Continue using `ARTIFACT_MAX_SIZE_BYTES` env var.

**Rationale**:
- Already implemented in `getMaxArtifactSizeBytes()`.
- Spec FR-003 and FR-004: configurable, default sufficient.
- .env.example documents it; update comment to reflect new default.

**Alternatives considered**:
- New env name: Unnecessary; existing name is clear.
- Config file: Overkill for single numeric value.
