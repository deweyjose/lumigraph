# Roadmap

This roadmap is planning context only. Execution state lives in GitHub Issues.

## Now

- Core product cleanup around Astro Hub, posts, drafts, and integration sets
- Export management UX hardening
- Integration set workflow polish
- Docs and context cleanup

## Next

- Astro Hub revamp: Mission Control-style live astronomy experience
- Public post/detail polish and download ergonomics
- AI drafting improvements for posts

## Later

- Optional private checklists/todos tied to posts or integration sets
- PixInsight copilot capabilities
- Cloud execution pipeline

## Recommended execution order

- Finish the current reliability and UX lane before opening more platform surface:
  - #90 - export management hardening
  - #107 through #112 - automatic thumbnail generation slices
  - #91 - integration set workflow polish
- Treat Astro Hub as the main parallel frontend/product lane once one owner is available to push the visual system:
  - #136 - Mission Control redesign with mocked data
  - #137 - daily media contract and module
  - #138 - ISS tracker contract and module
  - #139 - astronomy calendar and event detail
  - #140 - final polish pass

## Parallel lanes

- Lane A: reliability and user-facing polish
  - #90, #107 through #112, #91
- Lane B: Astro Hub frontend revamp
  - #136, #137, #138, #139

## Worktree guidance

- Keep one git worktree per issue or tightly-coupled issue pair.
- Avoid sharing migrations, generated files, or route contracts across parallel branches unless one issue is explicitly the base dependency for the others.
- Merge in this order when lanes depend on each other:
  - specs/contracts before service/runtime work
  - backend contracts before frontend integration
  - mocked-data UX before live provider wiring
- Rebase long-running worktrees frequently against `main` after each merged slice.
- Close or relabel issues when the priority order changes so this file stays aligned with GitHub.

## Roadmap to issue process

- Break each roadmap theme into shippable slices.
- Create one GitHub issue per slice with the roadmap issue template.
- Apply the relevant lane labels: `backend`, `frontend`, `infra`, `docs`, `parallel`, `blocked`.
- Link created issues back into this file.

## Astro Hub design guidance

- Treat Astro Hub as a distinct Lumigraph product theme, not a generic dashboard page.
- Keep the current information architecture direction focused on Astro Hub, Posts, Drafts, and Integration Data.
- Do not port the Figma Make styling wholesale. Use it as a structural reference and implementation prompt, not the final design system.
- Prioritize one dominant Astro Hub hero surface, fewer stronger modules, clearer hierarchy, and explicit freshness/trust signals for live data.
- Design mobile behavior intentionally rather than shrinking the desktop sidebar-and-cards layout.
- Preserve the current backend and auth architecture while selectively adopting UI patterns from the Make file.

## Astro Hub references

- Figma Make reference: https://www.figma.com/make/5FNloP83Ll2SmMOShy1nUc/Astrophotography-site-features?t=rd7bY7av9bi7W99F-0
- Local screenshot references:
  - docs/restyle-ui/download.png
  - docs/restyle-ui/download-1.png
  - docs/restyle-ui/download-2.png
  - docs/restyle-ui/download-3.png
  - docs/restyle-ui/download-4.png
  - docs/restyle-ui/image.png
- Session design review summary:
  - Strong information architecture and useful command-center framing.
  - Weak brand distinctiveness, flat hierarchy, and template-like dashboard styling.
  - Astro Hub should move toward a more cinematic Mission Control experience with stronger hero treatment and telemetry trust signals.

## Make frame mapping

- AstroHub dashboard frames primarily inform #135, #136, #137, #138, #139, and #140.
- Integration Data screen patterns can inform UX cleanup in #91 without replacing the current storage/auth architecture.
- Posts list patterns are secondary reference material and should only influence future post-management polish where they improve clarity.
- The login screen is secondary reference material for shared auth and brand presentation, not a direct Astro Hub implementation target.

## Issue index

Add links as items are created.

- #64 - Umbrella: Agentic platform foundation (API cleanup, AI boundary, tool surface)
- #95 - Normalize API contracts for machine clients
- #96 - Extract a shared AI integration boundary
- #97 - Expose typed agent tool surfaces over domain services
- #90 - Roadmap: Harden export management UX and job lifecycle
- #107 - Roadmap: Auto-thumb generation pipeline for final post images
- #108 - Auto-thumb slice: data model and job state
- #109 - Auto-thumb slice: worker runtime and thumbnail generation
- #110 - Auto-thumb slice: publish/update integration and observability
- #91 - Roadmap: Polish integration set workflow UX
- #135 - Astro Hub revamp: Mission Control-style live astronomy experience
- #136 - Redesign Astro Hub as a dynamic Mission Control experience with mocked data
- #137 - Add Astro Hub daily photo/media module with normalized provider contract and fallback gallery
- #138 - Add a live ISS tracker to Astro Hub with normalized telemetry and refresh strategy
- #139 - Build an Astro Hub astronomy calendar and event detail experience
- #140 - Polish Astro Hub performance, accessibility, and mobile tuning after live data integration
