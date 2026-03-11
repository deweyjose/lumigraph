# Contract: Posts Page UI Structure

**Feature**: 001-improve-gallery-ux  
**Interface**: Logged-in Posts page (`/gallery`)

## Page Structure

The Posts page MUST render in this order:

1. **Header** (exactly one)
   - One primary title (e.g., "Posts")
   - One subtitle directly below the title
2. **Content area**
   - Grid of post cards, OR
   - Empty state (when no public posts), OR
   - Loading state (when data is pending)

## Header Contract

| Element | Requirement |
|---------|-------------|
| Title | Single `<h1>` or equivalent; user-facing label "Posts" |
| Subtitle | Single block of supporting text; describes page purpose |

## Content Contract

| State | Requirement |
|-------|-------------|
| Has posts | Grid of `PostCard` components; each links to post detail |
| No posts | Empty-state message + next-step action (e.g., Sign in to get started for logged-out) |
| Loading | Clear loading or skeleton; no conflicting CTAs |

## Terminology

User-facing text MUST use "Posts" (not "Gallery") for:
- Nav link label
- Page title (metadata and visible h1)
- Cross-links (e.g., "Back to Posts", "Browse Posts")

Route `/gallery` remains unchanged.
