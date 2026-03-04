# Data Model: Fix Auth Home Routing CTA

**Feature**: 001-fix-auth-home-routing  
**Date**: 2026-03-03

## Summary

No new database entities or schema changes. This feature affects only routing and UI visibility based on existing session state.

## Existing Entities (Unchanged)

- **User Session**: Auth.js JWT session; `auth()` returns `{ user, expires }` or `null`. No schema changes.
- **User**: Existing model; no changes.

## Routing Logic (No Persistence)

| Concept | Description | Source |
|---------|-------------|--------|
| Session state | Authenticated vs unauthenticated | `auth()` from Auth.js |
| Home route (`/`) | Entry point; redirects logged-in users to `/gallery` | Server component logic |
| Get Started CTA | Shown only when session is null | Conditional render on `/` |

No new persistence. Session is provided by Auth.js; routing decision is computed at request time.
