# Contract: Daily Canvas API

**Feature**: 001-home-astro-hub  
**Interface**: Server-side data for logged-in home page

## Overview

Daily canvas content is generated from NASA, Open Notify, and SpaceX APIs, then synthesized by OpenAI. Cached in `daily_canvas` table by date.

## Generation Flow

1. Check if row exists for today (UTC date).
2. If not: fetch NASA APOD, (optional) Mars/NEO/EPIC, Open Notify ISS, SpaceX latest launch.
3. Call OpenAI with API data as context; request structured output (events, calendar, highlights).
4. Store result in `daily_canvas`; return to client.
5. If OpenAI or APIs fail: use cached prior day or static fallback.

## API Surface (Internal)

- **Service**: `getOrGenerateDailyCanvas(date: Date): Promise<DailyCanvasContent>`
- **Repository**: `findDailyCanvas(date)`, `createDailyCanvas(date, content)`
- No public HTTP endpoint for canvas; page fetches via server component or RSC data fetching.

## Content Shape (TBD at implementation)

Suggested structure (JSON):

```json
{
  "events": [...],
  "calendar": "...",
  "highlights": [...]
}
```

Exact schema deferred to implementation; Zod schema will validate.
