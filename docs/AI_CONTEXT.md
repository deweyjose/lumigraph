# AI_CONTEXT.md — Lumigraph (Read This First)
Version: 0.1  
Last updated: 2026-02-15

## What is Lumigraph?
Lumigraph is a multi-user astrophotography platform.

Phase 1 (MVP): publish final images and datasets (integration artifacts) with rich metadata and AI-assisted writeups.  
Phase 2: structured workflows + guardrails.  
Phase 3: PixInsight Copilot (local-first).  
Phase 4: cloud execution using open tools first.

## Non-goals (for MVP)
- Not a generic repository of random files
- No PixInsight-in-cloud assumptions
- AI never auto-publishes user content

## Engineering guardrails
- Strict TypeScript
- No business logic in route handlers
- Validate all inputs with Zod
- Use service modules for core logic
- Prefer clear, boring patterns over cleverness

## Domain concepts
- Image Post: final image + metadata + narrative
- Dataset: collection of artifacts stored in S3
- Artifact: file with type + checksum + size
- Workflow: structured steps + intent + guardrails (Phase 2)

## What you (the AI) should do when implementing
- Read .specify/memory/constitution.md first.
- Read docs/PRODUCT.md and docs/ARCHITECTURE.md first.
- Implement minimal, testable increments.
- Update docs when changing scope or architecture.
- Prefer correctness and clarity over speed.
