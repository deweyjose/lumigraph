# Roadmap

This roadmap is planning context only. Execution state lives in GitHub Issues.

## Now

- Agentic platform foundation: API contracts, AI boundary, and tool surface
- Export management UX hardening
- Integration set workflow polish
- Docs and context cleanup

## Next

- Astro Hub revamp: Mission Control-style live astronomy experience
- Public post/detail polish and download ergonomics
- Guided processing planner v1: setup intake, tailored plan generation, and plan workspace
- Workflow orchestration v1: runtime spec, execution engine, and operator station
- AI drafting improvements for posts
- PixInsight-aware processing context for target/camera-driven guidance

## Later

- PixInsight copilot capabilities
- Cloud execution pipeline

## Recommended execution order

- Finish the current reliability and UX lane before opening more platform surface:
  - #90 - export management hardening
  - #107 through #112 - automatic thumbnail generation slices
  - #91 - integration set workflow polish
- Keep workflow work moving, but treat orchestration as the next major backend lane after capture:
  - #127 - orchestrator runtime spec
  - #128 - orchestrator execution engine
  - #129 - operator station
  - #130 - PixInsight-aware processing context
- Start planner work once the orchestration spec clarifies runtime and context boundaries:
  - #132 - guided planner intake
  - #133 - tailored plan generation
  - #134 - processing plan workspace
- Treat Astro Hub as the main parallel frontend/product lane once one owner is available to push the visual system:
  - #136 - Mission Control redesign with mocked data
  - #137 - daily media contract and module
  - #138 - ISS tracker contract and module
  - #139 - astronomy calendar and event detail
  - #140 - final polish pass

## Parallel lanes

- Lane A: reliability and user-facing polish
  - #90, #107 through #112, #91
- Lane B: workflow orchestration backend
  - #127, #128, #130
- Lane C: planner-first product UX
  - #132, #133, #134
- Lane D: Astro Hub frontend revamp
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
- Keep the current information architecture direction: Astro Hub, Posts, Workflows, Todos, and Integration Data remain a coherent grouping.
- Do not port the Figma Make styling wholesale. Use it as a structural reference and implementation prompt, not the final design system.
- Prioritize one dominant Astro Hub hero surface, fewer stronger modules, clearer hierarchy, and explicit freshness/trust signals for live data.
- Design mobile behavior intentionally rather than shrinking the desktop sidebar-and-cards layout.
- Favor the Make patterns for Workflows run monitoring and Todos more directly than Astro Hub, which needs a stronger custom visual treatment.
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
  - Workflows and Todos are the most directly reusable UI patterns from the Make exploration.

## Make frame mapping

- AstroHub dashboard frames primarily inform #135, #136, #137, #138, #139, and #140.
- Workflow run-monitor and assistant patterns should inform planner workspace follow-on work in #134 more than the older execution-engine framing.
- Integration Data screen patterns can inform UX cleanup in #91 without replacing the current storage/auth architecture.
- Posts list patterns are secondary reference material and should only influence future post-management polish where they improve clarity.
- The login screen is secondary reference material for shared auth and brand presentation, not a direct Astro Hub implementation target.

## Issue index

Add links as items are created.

- #64 - Umbrella: Agentic platform foundation (API cleanup, AI boundary, tool surface)
- #95 - Normalize API contracts for machine clients
- #96 - Extract a shared AI integration boundary
- #97 - Expose typed agent tool surfaces over domain services
- #98 - Define workflow, session, and run persistence for agent execution
- #104 - Persist workflow sessions and run records
- #105 - Persist run tool calls and artifact references
- #103 - Add private run inspection and resume APIs
- #90 - Roadmap: Harden export management UX and job lifecycle
- #107 - Roadmap: Auto-thumb generation pipeline for final post images
- #108 - Auto-thumb slice: data model and job state
- #109 - Auto-thumb slice: worker runtime and thumbnail generation
- #110 - Auto-thumb slice: publish/update integration and observability
- #91 - Roadmap: Polish integration set workflow UX
- #92 - Roadmap: Workflow capture v1 (spec and implementation slices)
- #116 - Specify workflow capture v1 domain model and API contract
- #117 - Persist workflow definitions and ordered step definitions
- #118 - Add private workflow definition CRUD APIs
- #119 - Build workflow capture v1 list and editor UX
- #120 - Launch workflow sessions from authored definitions
- #126 - Workflow orchestration v1 (agent runtime, event stream, operator station)
- #127 - Specify workflow orchestrator runtime, run-event schema, and operator interaction model
- #128 - Execute authored workflow definitions through an orchestrator agent
- #129 - Build an operator station for live orchestrator updates and run control
- #130 - Model PixInsight processing context for target-aware and camera-aware orchestration
- #131 - Guided processing planner v1 (setup intake, tailored plan, workflow instance)
- #132 - Capture astrophotography setup and session context through a guided planner intake
- #133 - Generate tailored preprocessing and integration plans from setup context
- #134 - Build a processing plan workspace for checklist, settings, and rationale review
- #135 - Astro Hub revamp: Mission Control-style live astronomy experience
- #136 - Redesign Astro Hub as a dynamic Mission Control experience with mocked data
- #137 - Add Astro Hub daily photo/media module with normalized provider contract and fallback gallery
- #138 - Add a live ISS tracker to Astro Hub with normalized telemetry and refresh strategy
- #139 - Build an Astro Hub astronomy calendar and event detail experience
- #140 - Polish Astro Hub performance, accessibility, and mobile tuning after live data integration
