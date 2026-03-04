# Quickstart: Fix Auth Home Routing CTA

**Feature**: 001-fix-auth-home-routing  
**Date**: 2026-03-03

## Prerequisites

- pnpm, Node.js
- Postgres running (`pnpm dev:db` or `docker compose up -d postgres`)
- `apps/web/.env` configured (AUTH_SECRET, DATABASE_URL)

## Manual Verification

### 1. Logged-In: Lumigraph Icon → No "Get Started"

1. Sign in.
2. From any authenticated page (e.g., `/gallery`, `/drafts`), click the Lumigraph icon in the header.
3. **Verify**: You are redirected to `/gallery` (or the authenticated home).
4. **Verify**: The "Get Started" button is NOT visible on the destination page.

### 2. Logged-In: Direct `/` Access

1. While signed in, navigate directly to `/`.
2. **Verify**: You are redirected to `/gallery`.
3. **Verify**: No "Get Started" CTA is shown.

### 3. Logged-Out: "Get Started" Preserved

1. Sign out (or use incognito).
2. Open `/` (home page).
3. **Verify**: "Get Started" button is visible.
4. **Verify**: Clicking "Get Started" routes to sign-in.

### 4. Session Transition

1. Sign in, click Lumigraph icon → verify redirect, no "Get Started".
2. Sign out, open `/` → verify "Get Started" visible.
3. Reload and repeat; behavior must match current session state.

## Commands

```bash
pnpm dev          # Start Next.js
pnpm lint         # Lint
pnpm typecheck    # TypeScript
pnpm test         # Unit tests
```
