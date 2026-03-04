# Contract: Home Page UI Structure

**Feature**: 001-home-astro-hub  
**Interface**: Home page (`/`)

## Auth-Aware Rendering

The home page MUST render one of two experiences based on session:

| Session | Destination | Content |
|---------|-------------|---------|
| Logged in | Astro hub | Daily canvas + AI chatbot |
| Logged out | Splash | Hero, feature cards, "Browse Posts" only; NO login button in main content |

## Logged-Out Splash Contract

| Element | Requirement |
|---------|-------------|
| Hero | Title "Lumigraph", tagline, primary CTA |
| Primary CTA | "Browse Posts" only (links to `/gallery`) |
| Login in main content | MUST NOT appear |
| Header | Exactly one login entry in upper right (UserNav) |

## Logged-In Astro Hub Contract

| Element | Requirement |
|---------|-------------|
| Daily canvas | Current events, astro calendar, astronomy highlights (from APIs + GenAI) |
| AI chatbot | Floating widget (bottom-right; expandable/collapsible); auth-gated |
| Navigation | Lumigraph icon → `/` (this page); Posts → `/gallery` |

## Navigation Contract

| Link | Logged in | Logged out |
|------|-----------|------------|
| Lumigraph icon | `/` (astro hub) | `/` (splash) |
| Posts | `/gallery` | `/gallery` |
