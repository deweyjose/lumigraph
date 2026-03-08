# Docs

This directory is intentionally lean. Keep long-lived context here and keep execution state somewhere else.

## Source of truth

- Runtime setup and repo layout: `README.md`
- Agent operating rules: `AGENTS.md`
- Execution state: GitHub Issues and PRs
- Feature design details: `specs/<feature>/`
- Long-lived product and engineering context: files in this directory

## Read order

1. `README.md`
2. `AGENTS.md`
3. `docs/PRODUCT.md`
4. `docs/ARCHITECTURE.md`
5. `docs/ENGINEERING.md`
6. `docs/ROADMAP.md`
7. `docs/DECISIONS.md` as needed

## Documents

- `PRODUCT.md` - scope, users, priorities, and non-goals
- `ARCHITECTURE.md` - system boundaries, flows, and security invariants
- `ENGINEERING.md` - coding, testing, and review conventions
- `ROADMAP.md` - current roadmap themes and issue links
- `DECISIONS.md` - decision log (ADR-lite)

## Maintenance rules

- Prefer editing an existing doc over adding a new one.
- Put each concern in one canonical place instead of repeating it in multiple docs.
- Keep roadmap themes here and execution detail in issues, PRs, and specs.
- Delete redirect-only or duplicate docs once callers no longer need them.
