# Quickstart: Improve Logged-In Posts UX

**Feature**: 001-improve-gallery-ux  
**Date**: 2026-03-03

## Prerequisites

- pnpm, Node.js
- Postgres running (`pnpm dev:db` or `docker compose up -d postgres`)
- `apps/web/.env` configured (AUTH_SECRET, DATABASE_URL)

## Manual Verification

### 1. Single Title and Subtitle

1. Sign in.
2. Navigate to `/gallery`.
3. **Verify**: Exactly one primary title ("Posts") and one subtitle visible at top.
4. **Verify**: No duplicate headings (e.g., no "Community" h2).

### 2. Post Cards

1. With public posts in DB, open `/gallery`.
2. **Verify**: Posts appear as a grid of cards.
3. **Verify**: Each card shows identifying content (title, target, etc.).
4. **Verify**: Clicking a card opens the post detail page.

### 3. Terminology Rename

1. **Nav**: Header nav link shows "Posts" (not "Gallery").
2. **Page**: Page title and h1 show "Posts."
3. **Cross-links**: "Back to Posts" / "Browse Posts" where applicable.

### 4. Empty State

1. With no public posts, open `/gallery`.
2. **Verify**: Empty-state message and next-step action (e.g., Sign in) for logged-out users.

### 5. Route Unchanged

1. **Verify**: `/gallery` still loads the Posts page (no redirect to `/posts`).

## Commands

```bash
pnpm dev          # Start Next.js
pnpm lint         # Lint
pnpm typecheck    # TypeScript
pnpm test         # Unit tests
```
