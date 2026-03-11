# Research: Home Astro Hub and Navigation UX

**Feature**: 001-home-astro-hub  
**Date**: 2026-03-03

## 1. NASA API Integration

**Decision**: Use NASA Open APIs at `https://api.nasa.gov/` with API key (free, rate limit 1000 req/day without key, 30 req/min with key).

**Rationale**: Official NASA APIs; well-documented. APOD (`/planetary/apod`) returns date, title, explanation, url, hdurl, media_type. Mars Rover, NEO, EPIC available for additional content.

**Key endpoints**:
- APOD: `GET /planetary/apod?api_key=...&date=YYYY-MM-DD`
- Mars Rover: `GET /mars-photos/api/v1/rovers/curiosity/photos?earth_date=...&api_key=...`
- NEO: `GET /neo/rest/v1/feed?start_date=...&end_date=...&api_key=...`
- EPIC: `GET /EPIC/api/natural?api_key=...`

**Alternatives considered**:
- Third-party wrappers: Rejected; direct API keeps dependencies minimal.
- Skip NASA: Rejected; spec requires astrophotography content.

## 2. Open Notify and SpaceX APIs

**Decision**: Use Open Notify (`http://api.open-notify.org/iss-now.json`) for ISS position; SpaceX API (`https://api.spacexdata.com/v4/launches/latest`) for launch data. No API keys required for these.

**Rationale**: User-provided links; simple JSON responses. Open Notify is free; SpaceX v4 is public.

**Alternatives considered**:
- Alternative ISS APIs: Open Notify is lightweight and sufficient.
- SpaceX v3: v4 is current; use v4.

## 3. OpenAI SDK and Usage

**Decision**: Use official `openai` npm package. Use Chat Completions API for both daily canvas synthesis and chatbot. Support streaming for chatbot (better UX).

**Rationale**: Official SDK; TypeScript support; streaming for chat. Single provider (OpenAI) per spec.

**Patterns**:
- Daily canvas: Single non-streaming completion; system prompt + API data as context; structured output (e.g., JSON or markdown).
- Chatbot: Streaming completion; system prompt defines astrophotography/astronomy assistant; pass conversation history.

**Alternatives considered**:
- Vercel AI SDK: Could simplify streaming; adds abstraction. Use raw OpenAI SDK for MVP; can migrate later.
- Non-streaming chatbot: Rejected; streaming improves perceived latency.

## 4. Daily Canvas Caching and Refresh

**Decision**: Store generated daily canvas in database. Add `daily_canvas` table (date, content, created_at). Generate on first request of day if missing; optionally back with Vercel Cron for pre-warm.

**Rationale**: FR-011 requires daily cadence. In-memory cache is lost on serverless cold starts. DB persistence ensures consistency across instances and survives restarts.

**Schema (minimal)**:
- `date` (date, PK)
- `content` (JSON or text)
- `created_at` (timestamp)

**Alternatives considered**:
- Vercel KV: Adds external dependency; DB already exists.
- No persistence, generate every request: Rejected; expensive and slow.
- S3: Overkill for small JSON; DB is simpler.

## 5. Chatbot Context and Session

**Decision**: Pass conversation history in each request; no server-side conversation persistence for MVP. Client sends last N messages; OpenAI receives full context.

**Rationale**: Stateless; no new tables. Client (React state or URL) holds messages. For long conversations, trim to last 10–20 messages to stay within token limits.

**Alternatives considered**:
- Store conversations in DB: Deferred; adds schema and complexity.
- Server-side session store: Same as above; stateless is sufficient for MVP.

## 6. Auth-Aware Home Routing

**Decision**: Single `/` route; page component checks `auth()` and conditionally renders logged-in home (astro hub) or logged-out splash. No middleware redirect.

**Rationale**: Next.js App Router; `auth()` is async server component. Keeps routing simple; one page, two UIs.

**Alternatives considered**:
- Separate routes `/` vs `/home`: Rejected; spec says Lumigraph icon → home at `/`.
- Middleware redirect: Possible but adds complexity; conditional render is clearer.

## 7. Splash Screen Without Login Button

**Decision**: Remove "Get Started" (sign-in) button from splash main content. Keep only "Browse Posts". Login remains in header (UserNav) per FR-006, FR-007.

**Rationale**: Spec explicitly requires splash without login button in main content; single login in upper right.

## 8. Error Handling and Fallbacks

**Decision**: If external API fails, omit that section and show partial content. If OpenAI fails, show cached prior day or static placeholder. If all fail, show friendly "Content unavailable" with retry.

**Rationale**: Spec edge cases require graceful degradation. No hard failures; always show something usable.
