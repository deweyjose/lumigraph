# Roadmap

This roadmap is planning context only. Execution state lives in GitHub Issues.

## Prioritization

- **Ship product features first**: collaboration on posts, integration-set workflows, drafting and AI-assisted flows, and other user-visible value.
- **Defer platform extraction and heavy refactors**: moving the API to AWS, standalone API services, and Vercel-runtime decoupling are **lowest priority**. Pick them up when the feature backlog allows—not as a prerequisite for new work.
- **Keep migration cheap later**: keep validation in route handlers, business logic in services, stable HTTP shapes, and explicit configuration boundaries where it is natural. Avoid one-off coupling that would make a future extraction painful, but do **not** block features on extraction planning.

## Now

- Post collaboration: annotation data model, region threads, and discussion polish
- Integration set detail and explorer ergonomics for large file sets
- AI-assisted drafting and writeup flows where they improve the posts experience
- Targeted auth documentation and hardening when it unblocks real user flows

## Next

- Agent-assisted image critique and trust UX on annotation threads
- Public post and detail polish, download ergonomics
- Shared app-shell and Astro Hub polish as follow-on to shipped shells and modules
- Astro Hub: further live-module and chat enhancements when prioritized via new issues

## Later

- Optional private checklists or todos tied to posts or integration sets
- PixInsight copilot capabilities
- **AWS-hosted API extraction and cutover** (issues [#174](https://github.com/deweyjose/lumigraph/issues/174) → [#171](https://github.com/deweyjose/lumigraph/issues/171) → [#172](https://github.com/deweyjose/lumigraph/issues/172) → [#173](https://github.com/deweyjose/lumigraph/issues/173)): contract, runtime decoupling, standalone service, frontend cutover—**lowest priority**
- Cloud execution pipeline

## Recommended execution order (open backlog)

Order reflects **features first**; platform migration issues are listed last intentionally.

1. **Post collaboration** (sequential where noted):
   - [#151](https://github.com/deweyjose/lumigraph/issues/151) — post annotation thread data model and API contract
   - [#152](https://github.com/deweyjose/lumigraph/issues/152) — interactive region-based comment threads on post images
   - [#153](https://github.com/deweyjose/lumigraph/issues/153) — annotation discussion polish, moderation, and trust cues
2. **Integration set workflow**:
   - [#156](https://github.com/deweyjose/lumigraph/issues/156) — integration set detail workspace sections
   - [#157](https://github.com/deweyjose/lumigraph/issues/157) — integration explorer density and keyboard accessibility
3. **Agent critique** (after core annotation ships):
   - [#154](https://github.com/deweyjose/lumigraph/issues/154) — agent-assisted image critique suggestions
   - [#155](https://github.com/deweyjose/lumigraph/issues/155) — review and trust UX for agent-authored critique
4. **Auth lane** (documentation before hardening):
   - [#160](https://github.com/deweyjose/lumigraph/issues/160) — document auth model, dormant email paths, and direction
   - [#162](https://github.com/deweyjose/lumigraph/issues/162) — harden password reset and auth flows (OWASP-aligned)
5. **Deferred — AWS API extraction** (lowest priority; no implied sequencing ahead of features):
   - [#174](https://github.com/deweyjose/lumigraph/issues/174) — define API extraction contract and migration boundary
   - [#171](https://github.com/deweyjose/lumigraph/issues/171) — decouple DB, S3, and auth runtime assumptions from embedded API
   - [#172](https://github.com/deweyjose/lumigraph/issues/172) — standalone AWS API service and route migration
   - [#173](https://github.com/deweyjose/lumigraph/issues/173) — cut Next.js app to AWS API and retire embedded API paths

## Parallel lanes

- **Lane D — post collaboration**: [#151](https://github.com/deweyjose/lumigraph/issues/151), [#152](https://github.com/deweyjose/lumigraph/issues/152), [#153](https://github.com/deweyjose/lumigraph/issues/153)
- **Lane E — agent critique**: [#154](https://github.com/deweyjose/lumigraph/issues/154), [#155](https://github.com/deweyjose/lumigraph/issues/155)
- **Lane F — integration-set ergonomics**: [#156](https://github.com/deweyjose/lumigraph/issues/156), [#157](https://github.com/deweyjose/lumigraph/issues/157)
- **Lane G — auth and account lifecycle**: [#160](https://github.com/deweyjose/lumigraph/issues/160), [#162](https://github.com/deweyjose/lumigraph/issues/162)  
  Direction: keep Auth.js + Prisma as the base, make the current auth surface explicit, then tighten OWASP-sensitive reset and account-lifecycle behavior. ([#161](https://github.com/deweyjose/lumigraph/issues/161) completed.)
- **Lane I — backend platform and API extraction (deferred)**: [#174](https://github.com/deweyjose/lumigraph/issues/174), [#171](https://github.com/deweyjose/lumigraph/issues/171), [#172](https://github.com/deweyjose/lumigraph/issues/172), [#173](https://github.com/deweyjose/lumigraph/issues/173) — **lowest priority**; execute only after feature goals allow.

Completed themes (Astro Hub modules, shared shell, Astro Hub chat tools, site polish, image zoom, and related issues) remain closed in GitHub; see **Issue index** for links.

## Worktree guidance

- Keep one git worktree per issue or tightly-coupled issue pair.
- Avoid sharing migrations, generated files, or route contracts across parallel branches unless one issue is explicitly the base dependency for the others.
- Merge in this order when lanes depend on each other:
  - contracts and UX docs before service/runtime work
  - backend contracts before frontend integration
  - mocked-data UX before live provider wiring
- Rebase long-running worktrees frequently against `main` after each merged slice.
- Close or relabel issues when the priority order changes so this file stays aligned with GitHub.
- Do **not** open or continue platform extraction work ahead of the prioritized feature backlog unless there is an explicit exception (security, outage, or legal).

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

## Auth references

- OWASP Forgot Password Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Better Auth email/password: https://www.better-auth.com/docs/authentication/email-password
- Better Auth magic link: https://www.better-auth.com/docs/plugins/magic-link
- Clerk forgot-password docs: https://clerk.com/docs/authentication/forgot-password
- Supabase reset-password docs: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail

## Issue index

Add links as items are created.

### Active (open) backlog

- [#151](https://github.com/deweyjose/lumigraph/issues/151) — Post annotation thread data model and API contract
- [#152](https://github.com/deweyjose/lumigraph/issues/152) — Region-based comment threads on post images
- [#153](https://github.com/deweyjose/lumigraph/issues/153) — Annotation discussion polish, moderation, trust cues
- [#154](https://github.com/deweyjose/lumigraph/issues/154) — Agent-assisted image critique suggestions
- [#155](https://github.com/deweyjose/lumigraph/issues/155) — Review and trust UX for agent-authored critique
- [#156](https://github.com/deweyjose/lumigraph/issues/156) — Integration set detail workspace sections
- [#157](https://github.com/deweyjose/lumigraph/issues/157) — Integration explorer density and keyboard accessibility
- [#160](https://github.com/deweyjose/lumigraph/issues/160) — Document Lumigraph auth model and direction
- [#162](https://github.com/deweyjose/lumigraph/issues/162) — Harden password reset and auth flows (OWASP)
- [#174](https://github.com/deweyjose/lumigraph/issues/174) — API extraction contract (deferred, lowest priority)
- [#171](https://github.com/deweyjose/lumigraph/issues/171) — Decouple DB/S3/auth runtime from embedded API (deferred)
- [#172](https://github.com/deweyjose/lumigraph/issues/172) — Standalone AWS API service (deferred)
- [#173](https://github.com/deweyjose/lumigraph/issues/173) — Cut Next.js app to AWS API (deferred)

### Completed / superseded (reference)

- #135 — Astro Hub revamp: Mission Control-style live astronomy experience
- #136 — Redesign Astro Hub with mocked data
- #149 — Shared app shell restyle
- #137 — Astro Hub daily photo/media module
- #138 — ISS tracker module
- #139 — Astronomy calendar and event detail
- #140 — Astro Hub polish after live data
- #60 — Site-wide layout and page polish
- #158 — Image inspection zoom and magnifier on post detail
- #161 — Transactional email for password reset and email-link auth
- #164–#167 — Astro Hub chat: Responses API, source tools, web search, guardrails
- #93 — AI drafting / writeup assist planning (superseded legacy M2 set)
