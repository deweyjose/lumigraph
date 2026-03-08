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

## Roadmap to issue process

- Break each roadmap theme into shippable slices.
- Create one GitHub issue per slice with the roadmap issue template.
- Apply the relevant lane labels: `backend`, `frontend`, `infra`, `docs`, `parallel`, `blocked`.
- Link created issues back into this file.

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
