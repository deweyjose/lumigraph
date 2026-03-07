# Simplify posts and assets API

## Goal
Reduce the number of image-posts API routes by unifying asset delivery (final image and thumbnail) into a single endpoint.

## Current state
- `GET /api/image-posts/[id]/thumb` — redirects to presigned S3 URL for thumbnail
- `GET /api/image-posts/[id]/image` — redirects to presigned S3 URL for final image

Both routes share the same logic (auth, presign, redirect); only the role (thumb vs image) differs.

## Changes
1. **Unified asset route**  
   Add `GET /api/image-posts/[id]/assets/[role]` where `role` is `image` or `thumb`. Same behavior: validate post id, check access, redirect to presigned URL.

2. **Update clients**  
   In `src/lib/image-url.ts`, `getFinalImageDisplayUrl` should build URLs as `/api/image-posts/${postId}/assets/${role}`.

3. **Remove old routes**  
   Delete `app/api/image-posts/[id]/thumb/route.ts` and `app/api/image-posts/[id]/image/route.ts`.

## Outcome
- Single handler for post assets; easier to extend (e.g. more roles later).
- Clearer URL shape: `/api/image-posts/:id/assets/:role`.
