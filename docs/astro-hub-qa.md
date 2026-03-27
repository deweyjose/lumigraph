# Astro Hub QA Checklist (#140)

Use this checklist for the Astro Hub polish pass before merge.

## Environment

- Run `pnpm dev` and sign in to load the authenticated home (`/`).
- Test in Chrome responsive mode at `320px` and desktop width.

## Accessibility

- **Keyboard only**
  - Tab through Astro Hub modules in logical order.
  - Open a Mission Watch item, then close the dialog with `Escape`.
  - Verify focus returns to the same list row button.
- **Screen reader semantics**
  - Verify one page-level heading (`Live Orbit Desk`) is announced.
  - Verify modules announce as labeled regions (Today in Space, ISS telemetry, Mission Watch).
- **Reduced motion**
  - Enable OS/browser reduced-motion preference.
  - Verify decorative spins/hover motion are minimized.

## Mobile ergonomics

- At `320px` width, verify no clipped text or inaccessible controls in:
  - Hero panel
  - ISS tracker
  - Mission Watch list and dialog
- Open chat FAB/panel on a mobile viewport and verify it clears safe-area insets.

## Performance and behavior

- Leave Astro Hub open, switch the browser tab to background for at least 10 seconds, then return.
- Verify ISS updates resume on return and no UI errors appear.
- Confirm list filters and ISS panel remain responsive during live updates.

## Edge and failure states

- For Mission Watch, apply a day filter with no matching events and verify the empty state message is clear.
- Simulate a source outage or failure path (local mock/offline) and verify module error/fallback messaging is readable and intentional.

## Required checks

- `pnpm format:fix`
- `pnpm format`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
