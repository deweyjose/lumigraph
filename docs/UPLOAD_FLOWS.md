# Upload flows: final images and dataset artifacts

How final images and dataset/artifact uploads work and what to implement.

---

## 1. Final images (ImagePost)

**Goal:** Let the user upload the main image (and optionally thumb) for a post so the card and detail page show a real image instead of the placeholder.

**S3 layout (existing):** `users/{userId}/images/{imagePostId}/final/{filename}` — e.g. `web.jpg`, `thumb.jpg`, `original.tif`. Key helper: `imageFinalKey(userId, imagePostId, filename)` in S3 service.

**DB:** `ImagePost.finalImageUrl` and `finalImageThumbUrl`. We store the **S3 key** in these fields (not a public URL). At display time we generate a presigned GET URL from the key so images work without public S3.

### Flow

1. **User:** On post detail (or edit), chooses “Upload image” and picks a file.
2. **Client:** Asks backend for a presigned upload URL for that post + filename.
3. **Backend:** `POST /api/image-posts/:id/final-image/presign` — auth, ensure user owns post, build key with `imageFinalKey(userId, postId, filename)`, call S3 `createPresignedUploadUrl`, return `{ uploadUrl, key }`.
4. **Client:** `PUT` the file to `uploadUrl` (same `Content-Type` as requested).
5. **Client:** Calls “complete” so the post is updated with the key.
6. **Backend:** `POST /api/image-posts/:id/final-image/complete` — body `{ key, role: 'main' | 'thumb' }`. Validate key matches `users/{userId}/images/{postId}/final/...`, then set `finalImageUrl` (main) or `finalImageThumbUrl` (thumb) to that key.
7. **Display:** When rendering a post that has `finalImageUrl`/`finalImageThumbUrl` set, we need a URL for `<img src>`. Use a proxy route: `GET /api/image-posts/:id/thumb` and `GET /api/image-posts/:id/image` that load the post, check visibility/ownership, then **redirect** to `createPresignedDownloadUrl(bucket, post.finalImageThumbUrl)` (or `finalImageUrl`). Then use `src="/api/image-posts/xxx/thumb"` in the UI so the browser gets a signed URL via redirect.

### API to add

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/image-posts/:id/final-image/presign` | Body: `{ filename, contentType? }`. Return `{ uploadUrl, key }`. |
| POST | `/api/image-posts/:id/final-image/complete` | Body: `{ key, role: 'main' \| 'thumb' }`. Update post’s finalImageUrl / finalImageThumbUrl. |
| GET  | `/api/image-posts/:id/thumb` | 302 redirect to presigned URL for `finalImageThumbUrl` (for card). |
| GET  | `/api/image-posts/:id/image` | 302 redirect to presigned URL for `finalImageUrl` (for detail). |

### UI

- **Post detail page:** “Upload final image” (and optionally “Upload thumb”) → file picker → call presign → PUT → complete → refresh. Show current image if key is set via `<img src={/api/image-posts/${id}/thumb} />`.
- **Gallery card:** Already has `finalImageThumbUrl`; switch to using the proxy URL when the value is an S3 key (e.g. `src={post.finalImageThumbUrl?.startsWith('http') ? post.finalImageThumbUrl : `/api/image-posts/${post.id}/thumb`}` or have the server pass a `thumbUrl` that is the proxy path).

---

## 2. Datasets and artifacts

**Goal:** User creates a dataset (optionally linked to a post), then uploads files (FITS, stacks, etc.) that are stored in S3 and registered as DatasetArtifact rows.

**S3 layout (existing):** `users/{userId}/datasets/{datasetId}/{filename}`. Key helper: `datasetArtifactKey(userId, datasetId, filename)`.

**Existing:** Dataset CRUD service; `registerArtifact(datasetId, userId, payload)` with `filename`, `fileType`, `s3Key`, `sizeBytes`, `checksum?`.

### Flow

1. **Create dataset:** `POST /api/datasets` — body `{ title, description?, visibility?, imagePostId? }`. Auth, call dataset service `create`. Returns dataset.
2. **Presign artifact:** Client has a file; asks for upload URL. `POST /api/datasets/:id/artifacts/presign` — body `{ filename, contentType? }`. Auth, ensure user owns dataset, build key with `datasetArtifactKey`, return `{ uploadUrl, key }`.
3. **Client:** PUT file to `uploadUrl`.
4. **Complete artifact:** `POST /api/datasets/:id/artifacts/complete` — body `{ key, filename, fileType, sizeBytes, checksum? }`. Auth, call `registerArtifact`. Creates DatasetArtifact row.
5. **Download:** When someone requests a download, we need a presigned GET URL (and optionally track the download). e.g. `GET /api/artifacts/:id/download` — check dataset/post visibility, then return redirect or JSON `{ url }` with presigned download URL.

### API to add

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/datasets` | Create dataset (title, description?, visibility?, imagePostId?). |
| PUT  | `/api/datasets/:id` | Update dataset. |
| POST | `/api/datasets/:id/artifacts/presign` | Body: `{ filename, contentType? }`. Return `{ uploadUrl, key }`. |
| POST | `/api/datasets/:id/artifacts/complete` | Body: `{ key, filename, fileType, sizeBytes, checksum? }`. Call `registerArtifact`. |
| GET  | `/api/artifacts/:id/download` | (Later) Check visibility, return presigned download URL or redirect. |

### UI

- **Post detail or “Datasets” area:** “Add dataset” → form (title, description, visibility, optional link to current post) → create → redirect to dataset page or open “Upload files”.
- **Dataset view:** List artifacts; “Upload file” → pick file → presign → PUT → complete → add to list. Repeat for more files.

---

## 3. Implementation order

1. **Final image (minimal):**  
   - Add presign + complete + thumb/image proxy routes for image posts.  
   - On post detail, add “Upload final image” (single file → store as main; optionally use same as thumb for now).  
   - Use proxy URL for thumb in gallery card and post detail so the placeholder is replaced when a key is set.

2. **Dataset APIs:**  
   - Add `POST /api/datasets`, `PUT /api/datasets/:id`, then `POST .../artifacts/presign` and `.../artifacts/complete`.

3. **Dataset UI:**  
   - “Add dataset” from post or a datasets list, then “Upload files” with presign → PUT → complete per file.

4. **Download:**  
   - Implement `GET /api/artifacts/:id/download` with visibility check and presigned URL when you need artifact downloads.

---

## 4. Security / validation

- **Presign:** Validate filename (no path traversal, allowlist extension or type). Optional: max size in complete step.
- **Complete:** Verify the key matches the expected prefix for that user/post or user/dataset so clients can’t register arbitrary keys.
- **Proxy (thumb/image):** Only return/redirect if the viewer is allowed to see the post (public, unlisted, or owner).
