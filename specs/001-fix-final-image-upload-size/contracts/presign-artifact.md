# Contract: POST /api/datasets/:id/artifacts/presign

**Feature**: 001-fix-final-image-upload-size  
**Date**: 2026-03-03

## Purpose

Request a presigned PUT URL for uploading a dataset artifact. Size validation occurs here; the error message format is updated by this feature.

## Request

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/datasets/:id/artifacts/presign` | Required (session) |

### Path Parameters

| Name | Type | Description |
|------|------|-------------|
| id | UUID | Dataset ID |

### Request Body (JSON)

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| filename | string | Yes | 1–500 chars |
| contentType | enum | Yes | `application/zip`, `application/x-fits`, `image/fits` |
| contentLength | number | Yes | 0 ≤ value ≤ max (default 1GB). Integer, non-negative. |

## Response

### Success (200)

```json
{
  "uploadUrl": "https://...",
  "key": "users/{userId}/datasets/{datasetId}/{filename}"
}
```

### Error: File Too Large (400)

**Before (current)**: `"File size exceeds maximum allowed"`

**After (this feature)**:
- Message MUST include the limit in human-readable form (e.g. "1 GB", "500 MB").
- Message SHOULD suggest next steps (e.g. "Reduce file size or contact support for higher limits").
- Example: `"File size exceeds maximum allowed (limit: 1 GB). Reduce file size or contact support for higher limits."`

```json
{
  "code": "VALIDATION_ERROR",
  "message": "File size exceeds maximum allowed (limit: 1 GB). Reduce file size or contact support for higher limits."
}
```

### Other Errors

| Status | Code | When |
|--------|------|------|
| 401 | UNAUTHORIZED | Not signed in |
| 400 | VALIDATION_ERROR | Invalid body (other validation failures) |
| 400 | BAD_REQUEST | Invalid JSON |
| 404 | NOT_FOUND | Dataset not found or not owned |

## Configuration

- `ARTIFACT_MAX_SIZE_BYTES` (optional): Max size in bytes. Default: 1,073,741,824 (1 GB).
- Invalid or unset: falls back to default.
