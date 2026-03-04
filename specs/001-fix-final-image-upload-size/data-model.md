# Data Model: Fix Final Image Upload File Size Limit

**Feature**: 001-fix-final-image-upload-size  
**Date**: 2026-03-03

## Summary

No schema changes. This feature adjusts configuration and validation behavior only.

## Affected Entities

### DatasetArtifact (existing)

- **Purpose**: Represents an uploaded file in S3.
- **Relevance**: Size validation occurs at presign (before artifact row exists). The `sizeBytes` field is populated at complete step; no change to schema or validation of `sizeBytes` at complete.

### Validation Rules (behavior change)

| Step | Field | Rule | Change |
|------|-------|------|--------|
| Presign | `contentLength` | Must be ≤ max (from `getMaxArtifactSizeBytes`) | Default: 500MB → 1GB. Error message improved. |
| Complete | `sizeBytes` | No max check (S3 already received file) | No change. |

## State Transitions

No state transitions added or modified. Upload flow remains: presign → PUT to S3 → complete.
