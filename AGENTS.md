# Agent Working Agreement

## Done Criteria (CI Equivalent)

For any substantial code change, do not consider work done until all of the following pass:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`

If any check fails:

1. Fix the issue and re-run the failed check(s), or
2. Report the blocker with a concise error summary and why it could not be resolved in-turn.
