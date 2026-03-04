# Research: Improve Logged-In Posts UX

**Feature**: 001-improve-gallery-ux  
**Date**: 2026-03-03

## 1. Single Header vs. Dual Header

**Decision**: Use one primary title and one subtitle for the Posts page.

**Rationale**: The spec explicitly requires "single bold title, and sub title." The current page has two headings ("Gallery" + "Community") which creates visual hierarchy confusion. Consolidating to one title + one subtitle aligns with common content-discovery patterns (e.g., Pinterest, Behance) and reduces cognitive load.

**Alternatives considered**:
- Keep dual headers with clearer hierarchy: Rejected; spec requires single title/subtitle.
- Remove subtitle entirely: Rejected; spec requires subtitle for context.

## 2. Title and Subtitle Copy

**Decision**: Use "Posts" as the primary title and a supporting subtitle describing community content.

**Rationale**: Clarification session confirmed rename "Gallery" → "Posts." Subtitle should explain what the page shows. Current "Community" section copy ("Public posts from everyone on Lumigraph") is suitable; merge into single subtitle.

**Proposed copy**:
- **Title**: Posts
- **Subtitle**: Public astrophotography from the Lumigraph community. (or: Public posts from everyone on Lumigraph.)

**Alternatives considered**:
- "Community Posts": Rejected; "Posts" is simpler and matches nav label.
- Longer subtitle: Acceptable; pick one concise option during implementation.

## 3. Terminology Rename Scope

**Decision**: Rename user-facing "Gallery" to "Posts" in: nav link, page title, page h1, metadata, cross-links ("Back to Gallery", "Browse Gallery", "Cancel" destination label if shown). Route `/gallery` unchanged.

**Rationale**: Clarification: "rename user-facing 'Gallery' terminology to 'Posts' (route/path behavior unchanged)."

**Alternatives considered**:
- Rename route to `/posts`: Rejected; clarification says route unchanged. Would also conflict with `/posts/[slug]`.
- Keep "Gallery" in some places: Rejected; spec requires consistent "Posts" for user-facing text.

## 4. Empty State and Loading

**Decision**: Preserve existing empty-state UI; add loading/skeleton if not present. Empty state already shows "No public posts yet" and conditional "Sign in to get started" for logged-out users.

**Rationale**: Spec FR-008 and User Story 3 require clear empty-state and loading behavior. Current implementation has empty state; loading state may need verification.
