# Contract: Home Page Routing

**Feature**: 001-fix-auth-home-routing  
**Interface**: Home page (`/`) routing and CTA visibility

## Routing Contract

| Session State | Request to `/` | Result |
|---------------|----------------|--------|
| Logged in | GET `/` | 302 redirect to `/gallery` |
| Logged out | GET `/` | 200; render landing page with "Get Started" CTA |

## CTA Visibility Contract

| Element | Logged In | Logged Out |
|---------|-----------|------------|
| "Get Started" button (→ sign-in) | MUST NOT be shown | MUST be shown |
| "Browse Posts" button (→ /gallery) | N/A (redirected before render) | MAY be shown |

## Lumigraph Icon (Header)

| Session State | Click destination | Visible CTA on destination |
|---------------|-------------------|----------------------------|
| Logged in | `/` → redirect → `/gallery` | No "Get Started" |
| Logged out | `/` | "Get Started" visible |

## Session Resolution

- Session MUST be resolved server-side via `auth()` before rendering or redirecting.
- No conflicting CTAs MAY be shown during session resolution (FR-006).
