# Data Model: Improve Logged-In Posts UX

**Feature**: 001-improve-gallery-ux  
**Date**: 2026-03-03

## Summary

No new database entities or schema changes. This feature affects only UI presentation and terminology.

## Existing Entities (Unchanged)

- **ImagePost**: Existing model; Posts page displays public posts via `listPublicPosts`. No field changes.
- **User**: Session used for auth; no changes.

## Display Structure (UI-Only)

### Posts Page Header

| Concept | Description | Source |
|---------|-------------|--------|
| Title | Single primary heading (e.g., "Posts") | Static copy |
| Subtitle | Supporting text below title | Static copy |

### Post Card (Existing)

| Concept | Description | Source |
|---------|-------------|--------|
| Post Card | One card per public post | `PostCard` component; props from `listPublicPosts` result |

No new persistence. Title and subtitle are page-level static content, not stored in DB.
