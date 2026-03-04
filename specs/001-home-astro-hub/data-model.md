# Data Model: Home Astro Hub and Navigation UX

**Feature**: 001-home-astro-hub  
**Date**: 2026-03-03

## Summary

One new database entity for daily canvas cache. No changes to existing User, ImagePost, Dataset models. Chatbot is stateless (no persistence).

## New Entity: DailyCanvas

| Field | Type | Description |
|-------|------|-------------|
| date | date (PK) | Calendar date (UTC) for which content was generated |
| content | Json | Synthesized content (structure TBD; e.g., sections for events, calendar, highlights) |
| createdAt | DateTime | When the row was created |

**Purpose**: Cache GenAI-synthesized daily content. One row per day. Generated on first request of day or via cron; subsequent requests read from DB.

**Validation**: `date` must be unique. `content` must be valid JSON.

## Existing Entities (Unchanged)

- **User**: Session for auth; no changes.
- **ImagePost**, **Dataset**: Unchanged.

## External Data (No Persistence)

- **NASA/Open Notify/SpaceX API responses**: Fetched at generation time; not stored (only synthesized output is stored).
- **Chatbot conversation**: Client-held; no server-side persistence for MVP.

## Migration

Add migration for `daily_canvas` table:

```prisma
model DailyCanvas {
  date      DateTime @id @db.Date
  content   Json
  createdAt DateTime @default(now()) @map("created_at")

  @@map("daily_canvas")
}
```
