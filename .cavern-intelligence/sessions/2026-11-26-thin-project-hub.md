# 2026-11-26 — Thin pages, second page: the project hub (restructure phase 7)

**Owner's queue (2026-11-26):** phase 7, one page per PR, the hub third in
the owner's order (the Lounge, second, was already thin — a 130-line page
over `useLounge` and its components — so it needed no PR). The hub page was
438 lines; it is 303 after this PR. Moved verbatim; no behaviour changes.

**What moved out of `app/(suite)/projects/[id]/page.tsx`:**

- `components/projects/hub/useProjectHubData.ts` — both loads: the project
  row mapped to the hub's view model (with the redirect to /projects when
  the row is missing, and the session following the viewed project), and
  the overview numbers (counts with the eighths-to-pages rule, milestones,
  portfolio pieces, crew). The page keeps the mutations — visibility,
  logline, logo — through the returned `setProject`. The hook makes its own
  effect event for following the project: React forbids passing an effect
  event down, so it reads `useProject` itself.
- `components/projects/hub/HubTopBar.tsx` — the top strip: online count,
  the task tally, and the owner's visibility picker with the share-link
  copy. Its copy button carried the page's one grandfathered literal
  colour; the gate's `lint-baseline-shrinks` check refuses new
  suppressions, so the violet became `color-mix` on `var(--jobs-color)` —
  which is that exact violet, themed.
- `DistributionPreview` joined the other department previews in
  `DeptWindow.tsx`.

The page also shed four dead bindings its lint baseline had been carrying
(the `Phase` and `ScriptFormat` type imports, an unused `useConfirm()`, an
unused `setActiveProject`), so its suppressions entry shrank from three
rules to the one `any` its visibility handler still uses. The bible
inventory was regenerated for the page's new size.

**Still in the page:** the title block, the phase/brief/guide panels
(already components) and the department grid — the orchestrator layout,
which is what a thin page is.

**Verified:** typecheck (app + e2e), lint (0 errors), the full unit suite
and a production build locally; `npm run sync-intel` no drift. New unit
tests (`HubTopBar.test.tsx`, 4 tests) pin the top bar's conditional
rendering, the visibility picker and the copy-link button. The project
e2e specs are opt-in against the local stack and run in the nightly; they
are this PR's live proof, with the owner's next visit to a project hub.
