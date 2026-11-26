# One home — rebase onto current main (2026-11-26, PR #655)

The 2026-11-18 one-home PR (Community folded into `/`) sat ~100 commits behind
main. Rebased by cherry-picking its five non-merge commits onto current main in
a fresh worktree. The only conflicts were in `bible/inventory.md` (generated):
resolved by taking main's version each time and regenerating the inventory at
the end (`npm run bible`). The nine files main had also touched (MobileTabBar,
EcosystemTaskbar, island spec, push dispatch, admin page, suppressions, …)
auto-merged and were checked by hand — main's changes and the PR's both stand.

Decisions made at the rebase (grounds in `plans/2026-11-18-one-home.md`, which
records the owner's design for this fold):

- **TheCavern figures + the resume band stay deleted — their content is carried,
  not lost.** TheCavern's four figures (Creators / Screenplays / Productions /
  References & media, from `getPlatformStats`) are the home page's own stats
  grid when signed out and ride the live ticker when signed in; its tabbed
  part-picker is the new home's module grid on desktop and `ModulePicker` on a
  phone, with the same previews and the same data. The resume band's job —
  resume the active project, last-edited script, a way into ScriptOS/Studio —
  is done by the signed-in hero button (Open *active project*), Your day
  (which carries the Continue offer) and the "Jump back in" grid, whose
  ScriptOS tile shows the latest script. Restoring either block would duplicate
  content on the same page. This matches the plan's decision table, so no new
  owner call was needed.
- **The guessed 46svh signed-in hero is gone.** The design system has no
  compact-hero fraction (the only hero sizing elsewhere is the full-screen
  100svh, which the signed-out state keeps). The signed-in hero now sizes to
  its content with standard section padding, so Your day starts right under
  the mark at any screen height. Plan doc updated.
- **Mobile audit routes updated.** `scripts/mobile-audit.mjs` audited
  `/community` (all-zero baseline); it now audits `/` first, and the baseline
  keys `portrait|landscape /community` became `/` (values unchanged — the
  home's real numbers are CI's to measure on this PR; any delta there is read
  before it is accepted). `theme-scan.mjs` and `e2e/page-errors.spec.ts`
  route lists/states moved from `/community` to `/` the same way. `/hub` and
  `/today` stay in the audit: they redirect to `/` and now prove the redirect
  lands on a clean page.
- **Bundle: no budget raised.** Measured after a local production build:
  `/` is 311 kB first-load JS against the 358 kB budget on current main
  (and under the older 325 kB figure) — the PR's own `next/dynamic` splits
  (SignedInHome, ModulePicker) plus main's #764 headroom cover the denser
  home. `performance-budget.json` untouched.
- **Review (RULES 11, risk-high/Large):** `scripts/claude-review.mjs` cannot
  run here (it shells out to an unauthenticated `gh`), so the full diff was
  reviewed by hand. One real finding, fixed: `ModulePicker`'s tab buttons
  were ~34px tall (under the audit's 44px thumb target) and its tab panel
  lacked the tab wiring TheCavern had — tabs now have `minHeight: 44`,
  ids and `aria-controls`/`aria-labelledby`. The rest of the diff checked
  out: redirects preserve query strings, no mocks (real Community components
  and data), auth default redirect and manifest `start_url` moved to `/`.

Verified locally in the worktree: typecheck, lint (0 errors), full unit suite
(3,655 passed), production build, `npm run budget` (all 57 pages within
budget, `/` 311/358 kB). Not verified: a browser look at the new home — this
VM has no local Supabase stack/Docker, so the signed-in/signed-out home was
not eyeballed here; the PR's CI mobile-audit job (audit + page-errors +
theme-scan on the local stack) is the browser check, and its deltas must be
read before merge. A real iPhone pass remains unchecked, as the original PR
also noted.
