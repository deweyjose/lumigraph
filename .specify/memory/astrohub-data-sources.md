# Astro Hub Data Sources

Purpose: handoff notes for wiring better live data into Astro Hub.

Existing code context:
- Current fetchers live in [apps/web/src/server/services/external-apis.ts](/Users/dewjose/repos/lumigraph/apps/web/src/server/services/external-apis.ts)
- Current Astro Hub contracts live in [apps/web/src/lib/astro-hub.ts](/Users/dewjose/repos/lumigraph/apps/web/src/lib/astro-hub.ts)

## Recommended Source Table
| Priority | Source | Type | URL / Endpoint | Auth | Suggested Astro Hub Use | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | NASA APOD | JSON API | `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY` | `NASA_API_KEY` or `DEMO_KEY` | Hero module, daily canvas, featured media | Already fits existing code. Best high-signal hero source. Revalidate hourly or daily. |
| 1 | NASA main news feed | RSS | `https://www.nasa.gov/feed/` | None | Explore module, news rail, AI summary input | Official RSS. Current feed advertises hourly updates. Good broad fallback when APOD is not enough. |
| 1 | NASA Image of the Day | RSS | `https://www.nasa.gov/feeds/iotd-feed/` | None | Hero fallback, media carousel, alternate daily visual | Stronger image bias than the main news feed. Good companion to APOD. |
| 1 | NASA Artemis feed | RSS | `https://www.nasa.gov/missions/artemis/feed/` | None | Explore module, mission watchlist, launch/news cards | Narrower mission-specific stream. Useful if Astro Hub wants a “mission desk” feel. |
| 1 | NASA space station feed | RSS | `https://www.nasa.gov/missions/station/feed/` | None | ISS panel context, station news, mission notes | Pairs well with live ISS telemetry. |
| 1 | Where The ISS At | JSON API | `https://api.wheretheiss.at/v1/satellites/25544` | None | Replace current ISS telemetry source for ISS module | Better than the current Open Notify feed: HTTPS, richer fields, roughly 1 req/sec limit, velocity/altitude/visibility included. |
| 2 | Where The ISS At positions | JSON API | `https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=...` | None | ISS path preview, orbit trail, “next few points” visualization | Supports up to 10 timestamps per request. Good for map trail rendering. |
| 2 | SpaceX launches page | Web page | `https://www.spacex.com/launches` | None | Human-facing launch card source only | Good as a product reference, but not a preferred machine source. Likely requires scraping/browser automation and is brittle. |
| 2 | User-managed X account | Social/manual feed | user-provided account | X API or manual ingestion | Breaking updates, launch alerts, mission commentary | Viable only if you want editorial content or alerts. Treat as optional, low-trust, manual/moderated input. |
| 3 | Astronomy Magazine RSS feeds | RSS | `https://www.astronomy.com/rss-feeds/` | None | Explore/news module, astronomy editorial stories | Candidate source, but the page returned `403 Forbidden` from this environment. Another agent should verify exact feed URLs in a browser before wiring them. |

## Recommended Decisions

| Area | Recommendation | Why |
| --- | --- | --- |
| Hero media | Keep NASA APOD as primary, add NASA Image of the Day as fallback | APOD is still the cleanest daily visual source; IOTD gives better resilience when APOD is video-only or weak. |
| ISS telemetry | Replace `Open Notify` with `Where The ISS At` | Current repo uses `http://api.open-notify.org/iss-now.json`; WTIA gives HTTPS plus richer telemetry for the same module. |
| ISS context/news | Add NASA station RSS alongside live telemetry | Telemetry alone is thin; station news gives narrative value. |
| News / explore rail | Use NASA main feed first, then optionally Astronomy Magazine | NASA is official and stable. Astronomy is useful editorial enrichment, but needs feed URL verification. |
| Launch data | Do not rely on `https://api.spacexdata.com/v4/launches/latest` without validation | Live check on 2026-03-11 returned `Crew-5` dated 2022-10-05, so the current endpoint looks stale for this use. |
| Social layer | Only add X if you want moderated alerts or voice | It is not a stable canonical data layer for core Astro Hub modules. |

## Concrete Implementation Notes

### 1. Replace ISS source

Current:
- [apps/web/src/server/services/external-apis.ts](/Users/dewjose/repos/lumigraph/apps/web/src/server/services/external-apis.ts)
  uses `http://api.open-notify.org/iss-now.json`

Recommended replacement:
- `GET https://api.wheretheiss.at/v1/satellites/25544`

Useful fields returned:
- `latitude`
- `longitude`
- `altitude`
- `velocity`
- `visibility`
- `timestamp`
- `units`

This maps better to:
- [apps/web/src/lib/astro-hub.ts](/Users/dewjose/repos/lumigraph/apps/web/src/lib/astro-hub.ts)
  `AstroHubIssData`

### 2. Add RSS ingestion path

Likely shape for Astro Hub:
- `hero`: APOD primary, NASA IOTD fallback
- `explore`: NASA main feed items
- `telemetry`: source health items for APOD, NASA RSS, ISS telemetry
- `calendar`: keep mocked for now unless a separate astronomy-events source is chosen later

Minimal ingestion strategy:
- Fetch RSS server-side
- Normalize to a common item contract:
  - `id`
  - `source`
  - `title`
  - `url`
  - `publishedAt`
  - `summary`
  - `imageUrl?`
  - `tags[]`
- Cache per feed for 15-60 minutes
- Degrade per source independently

### 3. SpaceX handling

Avoid:
- depending on `api.spacexdata.com/v4/launches/latest`

If SpaceX content is still desired:
- treat `https://www.spacex.com/launches` as a manual/reference source
- or add a separate launch provider later after picking a source with reliable current schedules

## Proposed Source Contract

```ts
type AstroSourceKind = "api" | "rss" | "social" | "manual";

type AstroSourceRecord = {
  id: string;
  name: string;
  kind: AstroSourceKind;
  status: "live" | "degraded" | "fallback";
  trust: "high" | "medium" | "low";
  freshnessMinutes?: number;
  items?: Array<{
    id: string;
    title: string;
    url: string;
    publishedAt?: string;
    summary?: string;
    imageUrl?: string;
  }>;
  telemetry?: Record<string, string | number | boolean | null>;
};
```

## Suggested Next Slice For Another Agent

1. Swap ISS fetcher from Open Notify to WTIA in [apps/web/src/server/services/external-apis.ts](/Users/dewjose/repos/lumigraph/apps/web/src/server/services/external-apis.ts).
2. Add a small RSS fetch/parse service for:
   - `https://www.nasa.gov/feed/`
   - `https://www.nasa.gov/feeds/iotd-feed/`
   - `https://www.nasa.gov/missions/station/feed/`
3. Normalize those feeds into Astro Hub `hero` and `explore` modules.
4. Leave SpaceX out of the critical path until a reliable current source is chosen.

## Verification Notes

Verified on 2026-03-11:
- NASA RSS page exposes official feed URLs including `https://www.nasa.gov/feed/`, `https://www.nasa.gov/feeds/iotd-feed/`, and `https://www.nasa.gov/missions/station/feed/`
- NASA main RSS feed is live and reported `lastBuildDate` of Wed, 11 Mar 2026 20:36:11 +0000
- WTIA developer docs state no auth is required and rate limit is roughly 1 request per second
- WTIA live ISS endpoint returned current telemetry successfully
- `https://api.spacexdata.com/v4/launches/latest` returned `Crew-5` with `date_utc` `2022-10-05T16:00:00.000Z`
- `https://api.spacexdata.com/v4/launches/upcoming` also returned 2022-dated items, so that API should be treated as stale unless proven otherwise
- `https://www.astronomy.com/rss-feeds/` returned `403 Forbidden` from this environment
