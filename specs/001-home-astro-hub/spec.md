# Feature Specification: Home Astro Hub and Navigation UX

**Feature Branch**: `001-home-astro-hub`  
**Created**: 2026-03-03  
**Status**: Draft  
**Input**: User description: "Differentiate home vs posts navigation: logged in - Lumigraph icon goes to astrophotography content hub (current events, astro calendar, cool astronomy); Posts goes to posts. Logged out - Lumigraph and Posts toggle between splash and posts; single login in upper right; keep splash without login button."

## Clarifications

### Session 2026-03-03

- Q: Where will the logged-in home content come from? → A: External APIs (NASA, Open Notify, SpaceX) as data sources, with GenAI synthesizing a daily dynamic "canvas" of curated content from that data. APIs include: NASA (APOD, Mars Rover, NEO, EPIC), Open Notify (ISS position), SpaceX (launches).
- Q: Is an astrophotography/astronomer AI chatbot in scope? → A: Yes, in scope. OpenAI account will be used for both daily canvas synthesis and the chatbot.
- Q: Where should the astrophotography chatbot appear on the logged-in home page? → A: Floating widget (bottom-right corner; expandable/collapsible).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Logged-In Home as Astro Content Hub (Priority: P1)

As a signed-in user, when I click the Lumigraph icon, I land on a home page that showcases astrophotography-relevant content: current events, the astro calendar, and cool things happening in astronomy—not the posts gallery.

**Why this priority**: This differentiates home from posts and gives logged-in users a compelling reason to visit the root. Currently both Lumigraph and Posts lead to the same content.

**Independent Test**: Sign in, click the Lumigraph icon, and confirm the destination is an astrophotography content hub (events, calendar, astronomy highlights) rather than the posts gallery.

**Acceptance Scenarios**:

1. **Given** a logged-in user on any page, **When** they click the Lumigraph icon, **Then** they are routed to the home page at `/`.
2. **Given** a logged-in user is on the home page, **When** the page renders, **Then** they see astrophotography content such as current events, astro calendar, and astronomy highlights—not the posts gallery.
3. **Given** a logged-in user wants to browse posts, **When** they click "Posts" in the navigation, **Then** they are routed to the posts page and see the posts gallery.

---

### User Story 2 - Logged-Out Splash and Posts Toggle (Priority: P2)

As a logged-out visitor, when I click the Lumigraph icon or "Posts", I toggle between a big splash screen (with browse/login entry) and the posts page. The splash screen does not include a login button in its main content—login is available only in the upper-right header.

**Why this priority**: The user explicitly likes the logged-out splash without a login button and wants Lumigraph/Posts to toggle between splash and posts.

**Independent Test**: Sign out, click Lumigraph and Posts alternately, and verify the toggle between splash and posts. Confirm only one login entry exists (upper right).

**Acceptance Scenarios**:

1. **Given** a logged-out user, **When** they click the Lumigraph icon, **Then** they see the splash screen (no login button in main content).
2. **Given** a logged-out user, **When** they click "Posts", **Then** they see the posts page.
3. **Given** a logged-out user on the splash screen, **When** they click "Posts", **Then** they navigate to the posts page.
4. **Given** a logged-out user on the posts page, **When** they click the Lumigraph icon, **Then** they navigate to the splash screen.
5. **Given** a logged-out user views the splash screen, **When** the page renders, **Then** there is no login button in the main splash content area.
6. **Given** a logged-out user, **When** they look at the header, **Then** they see exactly one login entry in the upper right.

---

### User Story 3 - Single Login Entry (Priority: P3)

As any user, I see at most one login control in the upper-right area of the header. There are no duplicate login boxes or CTAs.

**Why this priority**: Reduces clutter and confusion. The user stated they do not need more than one login box.

**Independent Test**: As logged-out user, inspect the header and confirm only one login entry exists.

**Acceptance Scenarios**:

1. **Given** a logged-out user, **When** they view the header, **Then** there is exactly one login entry in the upper right.
2. **Given** a logged-out user on the splash screen, **When** the page renders, **Then** no additional login button appears in the splash content.

---

### User Story 4 - Astrophotography AI Chatbot (Priority: P4)

As a logged-in user on the home page, I can interact with an astrophotography/astronomer AI chatbot to ask questions about astronomy, astrophotography techniques, targets, and related topics.

**Why this priority**: Adds an engaging, differentiated experience to the home astro hub. Users get a knowledgeable assistant without leaving the platform.

**Independent Test**: Sign in, open the home page, locate the chatbot, and have a conversation about an astrophotography topic.

**Acceptance Scenarios**:

1. **Given** a logged-in user is on the home page, **When** the page renders, **Then** an AI chatbot appears as a floating widget (bottom-right; expandable/collapsible).
2. **Given** a user has the chatbot visible, **When** they send a message, **Then** they receive an AI-generated response relevant to astrophotography or astronomy.
3. **Given** a user is in a chatbot conversation, **When** they ask a follow-up question, **Then** the chatbot maintains context and responds appropriately.
4. **Given** a logged-out user, **When** they view the home (splash) page, **Then** the chatbot is not shown or is gated behind sign-in.

---

### Edge Cases

- User session expires while on the home astro hub; they should see the logged-out experience on next navigation.
- User opens the app in a new tab with a different auth state than another tab; each tab should reflect its own session.
- Slow auth resolution causes temporary loading; the UI should resolve to the correct home vs splash experience without showing conflicting content.
- Home astro content (events, calendar) is unavailable or slow to load; a clear fallback or loading state should be shown.
- One or more external APIs (NASA, Open Notify, SpaceX) fail or return errors; the system should degrade gracefully (e.g., show partial content or cached content).
- GenAI synthesis fails or times out; a fallback (e.g., cached prior day, raw API data, or static placeholder) should be shown.
- AI chatbot is unavailable or rate-limited; a clear error or retry message should be shown.
- User sends off-topic or inappropriate content to the chatbot; the chatbot should respond appropriately (e.g., redirect to astro topics, decline).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When logged in, clicking the Lumigraph icon MUST route the user to the home page at `/`.
- **FR-002**: The home page at `/` for logged-in users MUST display astrophotography content (current events, astro calendar, astronomy highlights)—not the posts gallery.
- **FR-003**: Clicking "Posts" in navigation MUST always route to the posts page for both logged-in and logged-out users.
- **FR-004**: When logged out, clicking the Lumigraph icon MUST show the splash screen.
- **FR-005**: When logged out, clicking "Posts" MUST show the posts page.
- **FR-006**: The logged-out splash screen MUST NOT include a login button in its main content area.
- **FR-007**: There MUST be exactly one login entry in the upper-right header when the user is logged out.
- **FR-008**: Lumigraph icon and "Posts" MUST have distinct destinations: Lumigraph = home (or splash when logged out), Posts = posts page.
- **FR-009**: The home page content for logged-in users MUST include at least: current astrophotography/astronomy events, astro calendar, and notable astronomy highlights.
- **FR-010**: Home page content MUST be synthesized from external API data (NASA, Open Notify, SpaceX) and GenAI to produce a daily dynamic "canvas" of curated astrophotography and astronomy content.
- **FR-011**: Content generation MUST refresh on a daily cadence so each day presents new synthesized content.
- **FR-012**: The logged-in home page MUST include an astrophotography/astronomer AI chatbot that users can interact with.
- **FR-013**: The chatbot MUST respond to user messages with relevant astrophotography and astronomy content, maintaining conversation context.
- **FR-014**: The chatbot MUST be available only to logged-in users; logged-out users MUST NOT see or access it.

### Key Entities *(include if feature involves data)*

- **Home Page Content (Daily Canvas)**: GenAI-synthesized content for logged-in users, generated daily from external API data. Sources: NASA (APOD, Mars Rover photos, NEO/asteroids, EPIC Earth imagery), Open Notify (ISS position), SpaceX (launches). The AI receives this data as a "canvas" and produces curated, dynamic content for the day.
- **Content Data Sources**: External APIs used as input for the daily canvas—[NASA Open APIs](https://api.nasa.gov/) (APOD, Mars Rover, NEO, EPIC), [Open Notify](http://api.open-notify.org/iss-now.json) (ISS position), [SpaceX API](https://api.spacexdata.com/v4/launches/latest) (launches).
- **Astrophotography AI Chatbot**: An interactive AI assistant on the logged-in home page, powered by OpenAI. Presented as a floating widget (bottom-right; expandable/collapsible). Users can ask questions about astronomy, astrophotography techniques, targets, and related topics. Auth-gated (logged-in only).
- **Splash Screen**: The logged-out landing experience with browse/login entry, without a login button in the main content.
- **Navigation Destinations**: Lumigraph icon → home (logged in) or splash (logged out); Posts → posts page.

### Assumptions

- NASA API (api.nasa.gov), Open Notify (ISS), and SpaceX API are available and suitable for production use. API keys (e.g., NASA) and rate limits are implementation concerns.
- OpenAI is the planned GenAI provider for both the daily canvas synthesis and the astrophotography chatbot. API keys and usage are managed via an existing OpenAI account.
- The posts page route and behavior remain as defined in existing product behavior.
- The upper-right login entry is the single, canonical way for logged-out users to sign in.
- This feature does not change the sign-in flow itself, only where and how often login is presented.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of logged-in Lumigraph icon clicks land on the home astro hub, not the posts gallery.
- **SC-002**: Logged-out users can toggle between splash and posts via Lumigraph and Posts with no duplicate login controls in the header.
- **SC-003**: User feedback indicates the home page feels distinct from the posts page and provides value (events, calendar, highlights).
- **SC-004**: Zero user reports of duplicate or redundant login boxes after release.
- **SC-005**: Logged-in users can successfully complete a multi-turn conversation with the astrophotography chatbot on the home page.
