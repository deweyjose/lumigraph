# Research: Fix Auth Home Routing CTA

**Feature**: 001-fix-auth-home-routing  
**Date**: 2026-03-03

## 1. Routing Strategy: Redirect vs Conditional Render

**Decision**: Redirect logged-in users from `/` to `/gallery` when they navigate to the home page.

**Rationale**: The spec requires "route logged-in users to the authenticated home experience." The gallery (Posts) page is the primary authenticated landing—it shows community content and provides clear next actions (Browse Posts, create drafts). Redirecting is simpler than maintaining two distinct home UIs on the same route and avoids any risk of showing "Get Started" during session resolution. Next.js server components can call `auth()` and return `redirect()` before rendering.

**Alternatives considered**:
- **Conditional render on `/`**: Show different content on `/` based on session (logged-in: no "Get Started"; logged-out: current landing). Rejected: more code paths, potential flash of wrong CTA during session load. Redirect is cleaner.
- **Redirect to `/drafts`**: Rejected; `/gallery` is the public-facing entry and aligns with "Browse Posts" as primary CTA. Drafts is a secondary destination.

## 2. Session Resolution and Loading State

**Decision**: Use server-side `auth()` in the home page. If session exists, redirect immediately. No client-side loading state needed for the redirect path.

**Rationale**: Auth.js `auth()` resolves session server-side. FR-006 requires "If auth state is unresolved momentarily, the UI MUST resolve to the correct logged-in or logged-out experience before showing conflicting CTAs." By performing the redirect in the server component before any HTML is sent, we never render the logged-out CTA to a logged-in user. For logged-out users, the page renders normally.

**Alternatives considered**:
- **Client-side session check**: Would require rendering something first, then redirecting—risk of brief "Get Started" flash. Rejected.
- **Middleware redirect**: Could add `/` to middleware and redirect there. Rejected: current middleware (proxy.ts) only protects specific routes; home is public. Keeping logic in the page keeps it localized and easier to reason about.

## 3. Terminology: "Get Started" vs "Getting Started"

**Decision**: Keep existing "Get Started" button label. Spec uses "Getting Started" but both convey the same intent. No change required.

**Rationale**: The spec's concern is the behavior (don't show sign-in CTA to logged-in users), not the exact copy. "Get Started" is already used in the codebase and is acceptable.
