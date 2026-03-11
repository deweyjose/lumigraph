# Roadmap

This roadmap is planning context only. Execution state lives in GitHub Issues.

## Now

- Core product cleanup around Astro Hub, posts, drafts, and integration sets
- Shared app shell restyle with left-side workspace nav and main canvas
- Docs and context cleanup

## Next

- Astro Hub revamp: Mission Control-style live astronomy experience
- Shared app-shell polish across Astro Hub, Posts, Drafts, and Integration Sets
- Public post/detail polish and download ergonomics
- AI drafting improvements for posts

## Later

- Optional private checklists/todos tied to posts or integration sets
- PixInsight copilot capabilities
- Cloud execution pipeline

## Recommended execution order

- Treat Astro Hub and the shared workspace shell as the current frontend/product lane:
  - #149 - shared app shell restyle
  - #137 - daily media contract and module
  - #138 - ISS tracker contract and module
  - #139 - astronomy calendar and event detail
  - #140 - final Astro Hub polish pass
- Follow with broader page polish once the shell and live Astro Hub modules settle:
  - #60 - site-wide polish and consistency
  - #93 - AI drafting improvements

## Parallel lanes

- Lane A: shared app shell and IA
  - #149, #60
- Lane B: Astro Hub live modules
  - #137, #138, #139, #140
- Lane C: drafting/product intelligence
  - #93

## Worktree guidance

- Keep one git worktree per issue or tightly-coupled issue pair.
- Avoid sharing migrations, generated files, or route contracts across parallel branches unless one issue is explicitly the base dependency for the others.
- Merge in this order when lanes depend on each other:
  - contracts and UX docs before service/runtime work
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
- The shared workspace shell direction is tracked in #149 and should establish the authenticated app layout for Astro Hub, Posts, Drafts, and Integration Sets.
- Integration Data screen patterns can inform UX cleanup in #91 without replacing the current storage/auth architecture.
- Posts list patterns are secondary reference material and should only influence future post-management polish where they improve clarity.
- The login screen is secondary reference material for shared auth and brand presentation, not a direct Astro Hub implementation target.

## Issue index

Add links as items are created.

- #135 - Astro Hub revamp: Mission Control-style live astronomy experience
- #136 - Redesign Astro Hub as a dynamic Mission Control experience with mocked data
- #149 - Shared app shell restyle with left-side workspace nav and main canvas
- #137 - Add Astro Hub daily photo/media module with normalized provider contract and fallback gallery
- #138 - Add a live ISS tracker to Astro Hub with normalized telemetry and refresh strategy
- #139 - Build an Astro Hub astronomy calendar and event detail experience
- #140 - Polish Astro Hub performance, accessibility, and mobile tuning after live data integration
- #60 - Site-wide layout and page polish
- #93 - AI drafting improvements for posts
