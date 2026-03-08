# Agent Working Agreement

This file defines how coding agents should operate in this repository.

## Collaboration model

- Keep work incremental and reviewable.
- Prefer one branch per issue.
- Prefer one PR per shippable slice.
- Do not treat conversational plans as done until they are reflected in GitHub issues.

## Roadmap -> Issues requirement

When roadmap work is discussed:

1. Summarize the plan in `docs/ROADMAP.md`.
2. Convert each shippable slice into a GitHub issue.
3. Include in each issue:
- problem statement
- scope / non-goals
- acceptance criteria
- dependencies
- labels (`backend`, `frontend`, `infra`, `docs`, `parallel`, `blocked`)
4. Link issues back into `docs/ROADMAP.md`.

## Implementation rules

- Keep API validation in route handlers, business logic in services.
- Preserve ownership and visibility checks for data/file access.
- Avoid hidden behavior changes; state migration intent explicitly.
- Update docs when behavior, architecture, or workflow changes.

## Done Criteria (CI Equivalent)

For any substantial code change, do not consider work done until all of the following pass:

1. `pnpm format:fix`
2. `pnpm format`
3. `pnpm typecheck`
4. `pnpm lint`
5. `pnpm test`

If any check fails:

1. Fix the issue and re-run the failed check(s), or
2. Report the blocker with a concise error summary and why it could not be resolved in-turn.

## Output expectations

In final summaries include:

- what changed
- why
- verification commands + outcomes
- next action (if any)
