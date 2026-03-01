# Authorization (AuthZ) Analysis — Lumigraph API

**Date:** 2026-03-01  
**Scope:** API endpoints in `apps/web/app/api/`, S3 presigned URLs, dataset artifacts, and planned file-upload flows.

---

## 1. Endpoint-by-endpoint summary

| Endpoint | Method | AuthZ enforced? | Where |
|----------|--------|-----------------|--------|
| `/api/image-posts` | POST | Yes | Route: `auth()` → 401 if no session. Service: `createDraft(session.user.id, …)` — post created for that user only. |
| `/api/image-posts/[id]` | PUT | Yes | Route: `auth()` → 401. Service: `updateDraft(session.user.id, id, …)` — ownership check in service (`existing.userId !== userId` → null). |
| `/api/auth/register` | POST | N/A (unauthenticated) | Creates new user; no access to other users’ data. Body: email, password, name only. |
| `/api/auth/forgot-password` | POST | N/A | No auth; operates on email only. No user enumeration (same response either way). |
| `/api/auth/reset-password` | POST | Yes (token-bound) | `userId` derived server-side from VerificationToken identifier (`password-reset:${userId}`). Client cannot supply userId. Token deleted after use. |
| `/api/auth/[...nextauth]` | GET, POST | Auth.js | Session/callback handling; no direct access to other users’ data from these handlers. |
| `/api/health` | GET | Public by design | No auth. See findings below on response content. |

**Not yet implemented (per ARCHITECTURE.md):**

- POST/GET `/api/image-posts` (GET list) — not present; when added, must filter by `session.user.id`.
- POST `/api/image-posts/:id/publish` — not present; when added, must verify post ownership via service.
- POST `/api/datasets`, PUT `/api/datasets/:id` — not present; when added, must use `session.user.id` and service-layer ownership.
- POST `/api/datasets/:id/artifacts/presign` — not present; **critical** — see §3.
- POST `/api/datasets/:id/artifacts/complete` — not present; must pass `session.user.id` and validate dataset ownership before `registerArtifact`.
- GET `/api/public/*`, POST `/api/downloads`, GET `/api/artifacts/:id/download` — not present; when added, must enforce visibility and ownership for signed URLs.

---

## 2. Service-layer ownership (verified)

- **Image post (`image-post.ts`):**
  - `createDraft(userId, data)` — creates post with `user: { connect: { id: userId } }`. No IDOR.
  - `updateDraft(userId, postId, data)` — loads post by `postId`, returns `null` if `existing.userId !== userId`. Ownership enforced.

- **Dataset (`dataset.ts`):**
  - `create(userId, data)` — creates dataset with `user: { connect: { id: userId } }`.
  - `update(userId, datasetId, data)` — loads dataset by id, returns `null` if `existing.userId !== userId`. Ownership enforced.

- **Artifact (`artifact.ts`):**
  - `registerArtifact(datasetId, userId, payload)` — loads dataset by id, returns `null` if `dataset.userId !== userId`. Ownership enforced. Callers must pass `session.user.id` as `userId` and only allow `datasetId` for datasets the user owns (e.g. after resolving from route param and verifying in service).

- **S3 (`s3.ts`):**
  - `createPresignedUploadUrl(bucket, key, options)` and `createPresignedDownloadUrl(bucket, key, options)` are key-agnostic; **whoever builds the key** determines scope. So any route that calls these **must** build the key from server-derived, ownership-verified identifiers (e.g. `session.user.id` and a dataset/imagePost id that has been verified to belong to that user). Never use client-supplied `userId`/`datasetId`/`imagePostId` without a server-side ownership check.

- **User / password reset:**
  - `registerWithPassword` — creates one new user; no access to existing users’ data.
  - `requestPasswordReset(email)` — looks up user by email, creates token with identifier `password-reset:${userId}`; no client-supplied user id.
  - `resetPasswordWithToken(token, newPassword)` — resolves `userId` from stored VerificationToken only; updates only that user; token consumed. No IDOR.

---

## 3. File-upload flow — current and planned

### 3.1 Current state

- **S3 service:** Key helpers `imageFinalKey(userId, imagePostId, filename)` and `datasetArtifactKey(userId, datasetId, filename)` exist. Presign functions take `(bucket, key, options)` and do not perform authZ; they only sign the given key.
- **Artifact service:** `registerArtifact(datasetId, userId, payload)` enforces `dataset.userId === userId` before creating an artifact.
- **No API route** currently calls `createPresignedUploadUrl`, `createPresignedDownloadUrl`, or `registerArtifact`. So there is no live IDOR in production for presign/artifact today, but the **pattern** for future routes must be fixed at design time.

### 3.2 AuthZ requirements for file endpoints (when implemented)

**Presign upload (e.g. POST `/api/datasets/:id/artifacts/presign`):**

1. Require authentication: `auth()` → 401 if no session.
2. Resolve resource from route: e.g. `datasetId` from `params.id`.
3. **Verify ownership** via service (e.g. `dataset.findById` then check `dataset.userId === session.user.id`, or a dedicated `getDatasetForUser(prisma, datasetId, session.user.id)` that returns null if not owner).
4. Build S3 key **only** from server-known data: `datasetArtifactKey(session.user.id, datasetId, filename)` where `filename` is from validated body (sanitized, no path traversal).
5. Optionally validate `contentType` and size limits.
6. Call `createPresignedUploadUrl(bucket, key, options)` and return URL to client.

**Presign download / signed download URL (e.g. GET `/api/artifacts/:id/download`):**

1. Resolve artifact (and optionally dataset/post) from id.
2. Apply **visibility rules**: if artifact/dataset/post is private or unlisted, require authentication and verify the requester is the owner (or has explicit access); for public, may allow unauthenticated.
3. Build S3 key from **server-side** artifact record (e.g. `artifact.s3Key` already stored) or from verified ownership (e.g. `datasetArtifactKey(ownerUserId, datasetId, filename)` with owner from DB). Never build key from client-supplied `userId`/`datasetId` without ownership check.
4. Call `createPresignedDownloadUrl(bucket, key, options)` and return URL; optionally track download.

**Artifact complete (e.g. POST `/api/datasets/:id/artifacts/complete`):**

1. Require authentication; use `session.user.id`.
2. Resolve `datasetId` from route param; verify ownership via dataset service (e.g. load dataset, confirm `dataset.userId === session.user.id`).
3. Validate body (Zod): filename, fileType, s3Key, sizeBytes, checksum. **Critical:** Validate that `s3Key` matches the expected pattern for this user and dataset (e.g. prefix `users/${session.user.id}/datasets/${datasetId}/`) to prevent registering an artifact that points to another user’s S3 path.
4. Call `registerArtifact(datasetId, session.user.id, payload)`. Service already enforces `dataset.userId === userId`; the s3Key check in the route prevents “claiming” someone else’s object.

**Image post final image upload (future):**

- Same pattern: auth → resolve image post by id → verify ownership via `updateDraft` or a dedicated get-by-id-for-user → build key with `imageFinalKey(session.user.id, imagePostId, filename)` → presign. Never use client-supplied `userId` or `imagePostId` without ownership check.

---

## 4. IDOR and missing ownership checks

| Risk | Status | Notes |
|------|--------|--------|
| PUT `/api/image-posts/[id]` — update another user’s post | Mitigated | `updateDraft(session.user.id, id, …)` enforces ownership; returns 404 if not owner. |
| Create post as another user | Mitigated | POST uses `session.user.id` only; no client-supplied user id. |
| Register / forgot / reset — mutate another user | Mitigated | Register creates new user. Forgot uses email only. Reset uses token-bound userId only. |
| Presign/artifact API accept client `userId`/`datasetId` without check | **Not yet implemented** | When implementing, **must** resolve resource from id, verify ownership in service, then build key from `session.user.id` (and server-verified ids). |
| Artifact complete: client supplies arbitrary `s3Key` | **Prevent when implemented** | Validate `s3Key` prefix equals `users/${session.user.id}/datasets/${datasetId}/` (or equivalent) so client cannot register an artifact pointing to another user’s S3 object. |

No **current** IDOR was found in existing routes. The only critical gap is in **future** file endpoints if they are implemented without the checks above.

---

## 5. Prioritized findings

### Critical (must fix before merge when implementing)

1. **Presign / artifact APIs (when added)**  
   - Do **not** accept `userId` (or `datasetId`/`imagePostId`) from the client to build S3 keys.  
   - Always: authenticate → resolve resource by id from route → verify ownership in service → build key from `session.user.id` and the verified resource id.  
   - Document this in ARCHITECTURE.md or ENGINEERING.md so all presign/artifact routes follow the same pattern.

2. **Artifact complete (when added)**  
   - Validate that `payload.s3Key` has the expected prefix for the current user and dataset (e.g. `users/${session.user.id}/datasets/${datasetId}/`) before calling `registerArtifact`. Reject otherwise to prevent registering artifacts that reference other users’ S3 objects.

### Warnings (should fix)

3. **GET `/api/health`**  
   - Returns `userCount` and a `debug` object. `debug` only exposes env var **names** and whether they are set (e.g. `DATABASE_URL ? "(set)" : "(unset)"`), not secrets — acceptable.  
   - `userCount` is a minor information disclosure (e.g. for enumeration). Consider removing `userCount` from the public health response or restricting `/api/health` in production to internal/load-balancer only.

### Suggestions (consider)

4. **Explicit ownership helpers**  
   - Consider adding `getImagePostForUser(prisma, postId, userId)` and `getDatasetForUser(prisma, datasetId, userId)` that return the entity only if `entity.userId === userId`, and use these in route handlers before calling S3/artifact services. This keeps “resolve + ownership” in one place and reduces mistakes in new routes.

5. **Audit logging**  
   - Log (without PII where possible) presign and artifact-complete actions (e.g. userId, resource id, key prefix) for security audits and abuse detection.

6. **Docs**  
   - Add a short “Security” or “AuthZ” subsection under ARCHITECTURE.md that states: (1) all mutation and presign routes use `session.user.id` from auth(); (2) resource ids from the URL are always validated for ownership in the service layer before building S3 keys or registering artifacts; (3) S3 keys are never built from client-supplied `userId`.

---

## 6. Suggested code/doc changes

- **When implementing POST `/api/datasets/:id/artifacts/presign`:**
  - In route: `auth()` → 401; get `datasetId` from params; load dataset and verify `dataset.userId === session.user.id` (or use `getDatasetForUser`); validate body (e.g. `filename`, `contentType`); build key with `datasetArtifactKey(session.user.id, datasetId, filename)`; call `createPresignedUploadUrl(getS3Bucket(), key, …)`; return URL.

- **When implementing POST `/api/datasets/:id/artifacts/complete`:**
  - In route: `auth()` → 401; verify dataset ownership as above; validate body including `s3Key` prefix `users/${session.user.id}/datasets/${datasetId}/`; call `registerArtifact(datasetId, session.user.id, payload)`.

- **Docs:**
  - In ARCHITECTURE.md (§6 or new §Security / AuthZ): add the three bullets in suggestion 6 above.
  - Optionally add a short “File upload authZ” note that presign and artifact-complete must always use `session.user.id` and server-verified resource ids for key construction and registration.

---

## 7. Checklist (for new file-related routes)

- [ ] Route requires `auth()` and returns 401 when no session.
- [ ] Resource id (e.g. `datasetId`, `imagePostId`) comes from route params (or validated path), not from body.
- [ ] Ownership verified via service (e.g. load by id, check `userId`), not only in UI.
- [ ] S3 key built from `session.user.id` and server-verified resource id (and validated filename); never from client-supplied `userId`.
- [ ] For artifact complete: `s3Key` in body validated to match expected prefix for this user and dataset.
- [ ] Inputs validated with Zod (filename, content-type, size, etc.).
