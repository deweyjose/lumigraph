# Feature Specification: Fix Auth Home Routing CTA

**Feature Branch**: `001-fix-auth-home-routing`  
**Created**: 2026-03-03  
**Status**: Draft  
**Input**: User description: "when logged in - if I click the Lumigraph icon I see a Getting Started button that sends me to login. that should only happen if not logged in"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Logged-In Home Experience (Priority: P1)

As a signed-in user, when I click the Lumigraph brand icon, I should land on a
logged-in experience and never see a "Getting Started" call-to-action that sends me
to sign in.

**Why this priority**: This is a core navigation and trust issue for authenticated
users and currently creates an obviously incorrect loop back to login.

**Independent Test**: Sign in, click the Lumigraph icon from any authenticated page,
and confirm the destination does not show the logged-out CTA.

**Acceptance Scenarios**:

1. **Given** a logged-in user on any authenticated page, **When** they click the
   Lumigraph icon, **Then** they are routed to the authenticated home experience.
2. **Given** a logged-in user is on the post-click destination, **When** the page
   renders, **Then** the "Getting Started" button is not shown.

---

### User Story 2 - Logged-Out Home Experience Preserved (Priority: P2)

As a logged-out visitor, I should still see the "Getting Started" path to sign in so
onboarding behavior remains unchanged.

**Why this priority**: The fix must not regress the intended entry path for new or
signed-out users.

**Independent Test**: Sign out, open the public home experience, and verify the
"Getting Started" button remains available and routes to login.

**Acceptance Scenarios**:

1. **Given** a logged-out user opens the home experience, **When** the page renders,
   **Then** the "Getting Started" button is visible.
2. **Given** a logged-out user clicks "Getting Started", **When** navigation occurs,
   **Then** they are sent to the sign-in flow.

---

### User Story 3 - Session-Accurate Navigation (Priority: P3)

As a user whose session state changes, I should see navigation behavior that matches
my current auth state on reload.

**Why this priority**: Auth transitions are common and must remain predictable to
avoid inconsistent header behavior.

**Independent Test**: Sign in and sign out in separate runs, reload, and verify the
Lumigraph icon and CTA behavior match current session state.

**Acceptance Scenarios**:

1. **Given** a user has just signed in, **When** they reload and click the Lumigraph
   icon, **Then** they see the logged-in destination and no "Getting Started" button.
2. **Given** a user has just signed out, **When** they open the home experience,
   **Then** they see the logged-out "Getting Started" entry point.

---

### Edge Cases

- The session expires while the user is browsing and they click the Lumigraph icon.
- The user opens the app in a fresh tab with stale cached content from the opposite
  auth state.
- The user authenticates in one tab and clicks the Lumigraph icon in another tab.
- Slow auth session resolution causes temporary loading state before final home UI is
  known.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Lumigraph icon click destination MUST be state-aware and route
  logged-in users to the authenticated home experience.
- **FR-002**: The "Getting Started" button that routes to sign-in MUST only be shown
  for logged-out users.
- **FR-003**: Logged-in users MUST NOT be presented a primary CTA that routes them to
  sign-in from the home destination reached via the Lumigraph icon.
- **FR-004**: Logged-out users MUST retain the current "Getting Started" to sign-in
  behavior.
- **FR-005**: Navigation behavior MUST be consistent after refresh and across
  authenticated pages where the Lumigraph icon is available.
- **FR-006**: If auth state is unresolved momentarily, the UI MUST resolve to the
  correct logged-in or logged-out experience before showing conflicting CTAs.

### Key Entities *(include if feature involves data)*

- **User Session State**: The current authenticated or unauthenticated status used to
  determine home routing and CTA visibility.
- **Home Entry CTA**: The "Getting Started" action intended only for users who are
  not authenticated.

### Assumptions

- Existing logged-in and logged-out home destinations are already defined in product
  behavior.
- This feature does not change sign-in flow content, only when it is presented.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In authenticated-session checks, 100% of Lumigraph icon clicks land on
  a page state without the "Getting Started" sign-in CTA.
- **SC-002**: In logged-out-session checks, 100% of home loads still show the
  "Getting Started" CTA and route to sign-in.
- **SC-003**: User-reported confusion about being sent back to sign-in after clicking
  the Lumigraph icon is reduced to zero in post-release feedback for this bug.
- **SC-004**: No regression is observed in logged-out sign-in entry completion rate
  after release.
