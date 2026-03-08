# Engineering

## Conventions

- TypeScript strict mode.
- Zod validation at route boundaries.
- Business logic in services, not route handlers.
- Prefer explicit code over clever abstractions.
- Keep ownership and visibility checks in server code, not the client.

## Testing strategy

- Unit tests for critical logic and edge cases.
- Integration tests for DB/S3 workflows where practical.
- Keep tests deterministic and fast by default.
- For new upload/download flows, cover unauthorized access, cross-user access, and invalid state transitions.

## Done criteria (substantial changes)

Run and pass:

1. `pnpm format:fix`
2. `pnpm format`
3. `pnpm typecheck`
4. `pnpm lint`
5. `pnpm test`

## Branch / PR

- Branch per issue (`type/issue-short-name`).
- Keep PRs small and focused.
- Include command outputs in PR summary.
- Update docs when behavior, workflow, or architecture changes.
