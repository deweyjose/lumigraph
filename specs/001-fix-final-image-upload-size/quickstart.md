# Quickstart: Verify Fix Final Image Upload File Size Limit

**Feature**: 001-fix-final-image-upload-size  
**Date**: 2026-03-03

## Prerequisites

- Postgres running (`docker compose up -d postgres`)
- LocalStack running for S3 (`docker compose up -d localstack`)
- Bucket created: `aws --endpoint-url http://localhost:4566 s3 mb s3://lumigraph-dev-local`
- `apps/web/.env` with `AWS_S3_ENDPOINT`, `AWS_S3_BUCKET`, etc. (see README)

## 1. Apply the Fix

After implementation, the default max is 1GB. No env change needed for default.

To test a custom limit:
```bash
# In apps/web/.env
ARTIFACT_MAX_SIZE_BYTES=524288000   # 500 MB - test rejection
# or
ARTIFACT_MAX_SIZE_BYTES=2147483648  # 2 GB - test higher limit
```

## 2. Run the App

```bash
pnpm dev
```

## 3. Manual Test: Upload Within Limit

1. Sign in.
2. Go to **Datasets** → create or open a dataset.
3. **Add files**: select a .zip or .fits file under 1GB (or under your configured limit).
4. Click **Upload N file(s)**.
5. **Expected**: Upload succeeds; file appears in artifact list.

## 4. Manual Test: Upload Exceeds Limit

1. Create a file > 1GB (or use a large test file), or set `ARTIFACT_MAX_SIZE_BYTES` to a small value (e.g. 1048576 = 1MB) and use any file > 1MB.
2. Attempt upload via **Add files**.
3. **Expected**: Error message appears quickly (before long upload). Message includes the limit (e.g. "limit: 1 GB" or "limit: 1 MB") and suggests next steps.

## 5. Automated Tests

```bash
# Unit tests (artifact service, presign route)
pnpm test

# Integration tests (with LocalStack)
pnpm test:integration
# or
pnpm test:integration:docker
```

## 6. Verify No Regression

- Upload a small file (< 100MB): should still work.
- Upload at exactly the limit: should succeed (boundary test).
