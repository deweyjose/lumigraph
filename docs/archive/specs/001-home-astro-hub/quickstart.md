# Quickstart: Home Astro Hub and Navigation UX

**Feature**: 001-home-astro-hub  
**Date**: 2026-03-03

## Prerequisites

- pnpm, Node.js
- Postgres running (`pnpm dev:db` or `docker compose up -d postgres`)
- `apps/web/.env` configured:
  - `AUTH_SECRET`, `DATABASE_URL`
  - `OPENAI_API_KEY` (for daily canvas + chatbot)
  - `NASA_API_KEY` (optional; higher rate limit; get at https://api.nasa.gov/)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| OPENAI_API_KEY | Yes | OpenAI API key for canvas synthesis and chatbot |
| NASA_API_KEY | No | NASA API key (improves rate limit; demos work without) |

## Manual Verification

### 1. Logged-Out Splash

1. Sign out (or use incognito).
2. Navigate to `/`.
3. **Verify**: Splash with "Lumigraph", "Browse Posts" visible.
4. **Verify**: No "Get Started" or login button in main content.
5. **Verify**: Header has exactly one login entry (upper right).

### 2. Logged-Out → Posts Toggle

1. Logged out, on splash (`/`).
2. Click "Posts" → **Verify**: Navigate to `/gallery`.
3. Click Lumigraph icon → **Verify**: Navigate back to `/` (splash).

### 3. Logged-In Home (Astro Hub)

1. Sign in.
2. Click Lumigraph icon → **Verify**: Land on `/` with daily canvas content.
3. **Verify**: Content includes events, calendar, or highlights (not posts gallery).
4. **Verify**: AI chatbot is visible and interactive.

### 4. Logged-In → Posts

1. Logged in, on home (`/`).
2. Click "Posts" → **Verify**: Navigate to `/gallery` (posts page).

### 5. Chatbot

1. Logged in, on home.
2. Send a message to chatbot (e.g., "What's a good target for beginners?").
3. **Verify**: Receive AI response.
4. Send follow-up → **Verify**: Context maintained.

### 6. Logged-Out Chatbot

1. Sign out.
2. **Verify**: Chatbot not visible on splash.

## Commands

```bash
pnpm dev          # Start Next.js
pnpm db:migrate   # Apply migrations (includes daily_canvas)
pnpm lint         # Lint
pnpm typecheck    # TypeScript
pnpm test         # Unit tests
```

## External APIs (for debugging)

- NASA APOD: `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY`
- Open Notify ISS: `http://api.open-notify.org/iss-now.json`
- SpaceX: `https://api.spacexdata.com/v4/launches/latest`
