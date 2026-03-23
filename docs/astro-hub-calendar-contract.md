# Astro Hub calendar contract

This document describes the internal contract for the **Mission Watch / time layer** module on Astro Hub (`getAstroHubCalendarSource` and `InteractiveAstroCalendarPanel`). It exists so we can swap or add providers without rewriting the UI.

## Shape

- **Envelope**: `AstroHubSourceEnvelope<"calendar">` from `@/lib/astro-hub` — same as other hub sources (`sourceKey`, `generatedAt`, `source`, `status`, `data`).
- **Payload**: `data.items` is an array of `AstroHubCalendarEvent`.

## `AstroHubCalendarEvent` fields

| Field           | Required | Purpose |
|----------------|----------|---------|
| `id`           | yes      | Stable key for React lists, filters, and future analytics. Format is implementation-defined but must be unique per row for a given fetch. |
| `stream`       | yes      | Upstream grouping: `artemis`, `station`, `nasa_news`, or `mock`. Drives badges and provider evolution. |
| `publishedAt`  | no       | ISO 8601 when RSS `pubDate` parses; powers date chips and sort order. Rows without a date appear under **Undated**. |
| `title`        | yes      | Headline. |
| `window`       | yes      | Human-readable time line for cards (typically formatted from `pubDate`). |
| `visibility`   | yes      | Short context line (e.g. mission lane, “newsroom watch”). |
| `summary`      | no       | Truncated preview for list rows. |
| `body`         | no       | Longer plain text for the detail dialog (full RSS text when available). |
| `sourceLabel`  | no       | Category or desk label from the feed. |
| `url`          | no       | Canonical article URL when present. |
| `imageUrl`     | no       | Hero/thumbnail URL when the feed exposes one. |
| `actions`      | no       | Outbound links (`AstroHubActionLink[]`), same pattern as other hub modules. |
| `relatedHint`  | no       | Optional extra line in the detail panel (mock stream uses this for “related content” hooks). |

## Providers (current)

1. **NASA RSS** (live path): three feeds are merged, de-duplicated by row `id`, sorted **newest `publishedAt` first**, then capped (see `calendar.ts` for `ITEMS_PER_FEED` / `MAX_CALENDAR_ITEMS`).
2. **Mock** (fallback): `astroHubMockSourceData.calendar` in `@/lib/astro-hub` — deterministic rows for offline/CI and degraded network.

## Semantics

- Rows are **mission/news timing by publication**, not a rigorous astronomical ephemeris. UI copy states this explicitly.
- Changing feed URLs, limits, or sort order is a **backend-only** change as long as the event shape stays compatible.
- Adding a new provider should introduce a new `stream` literal (and `STREAM_LABEL` in the client panel) rather than overloading an existing one.

## API route

`GET /api/astro-sources/calendar` returns the same envelope JSON for debugging and integrations.

## Hub layout

Astro Hub previously included a separate horizontal “Explore” strip backed by a subset of NASA RSS. That layer was removed to avoid duplicating **Mission Watch**, which remains the single merged NASA RSS surface on the hub (Artemis + Station + main feed). If volume grows, prefer filtering, sorting, or a dedicated content pipeline rather than reintroducing a parallel UI for the same feeds.
