# Session - 2026-11-26: the Places + Breakdown nightly failures, diagnosed from the run log (#731)

Diagnoses read from the actual job logs of nightly run 45826552054 (not the
issue comments, which only link the run), then fixed at the level each one
lived at:

- **breakdown (strict mode, "Push to budget" ×2) — real app bug.** PR #750's
  readiness panel (`BreakdownFocus`) offers a "Push to budget" button
  (`lib/studio/breakdown-focus.ts`, the budget-sync item) at the same time as
  the Breakdown toolbar's own "Push to budget" (`BreakdownView.tsx`). Two
  buttons, one name, one screen. The panel's label is now "Push estimate to
  budget" — the same pattern the panel already uses for categories ("Set unit
  costs" vs the toolbar's "Categories & rates") — and the focus unit test
  pins the distinct label.
- **breakdown-doubt (By scene tab never appears) — real app bug.** The doubt
  note (#756) lives on the By scene sheets, but `BreakdownView` hid the whole
  tab row behind its nothing-tagged empty state, so a project with scenes and
  no elements (exactly a doubtful read's likely state) could never reach it.
  The group-by tabs now show over the empty state, and the scene/day views
  render with zero elements.
- **locations + daylight (axe `label-content-name-mismatch`) — real app bug,
  one source.** The Locations "where it appears" jump button read "Sc N" but
  was labelled "Open scene N in the script" (WCAG 2.5.3: visible text must be
  in the accessible name). Its label now starts with the visible text and
  keeps the old phrase, so `world-locations`' locator still matches.
- **editor-package (same axe rule) — real app bug.** "Send to editor" was
  labelled "Send the package to the editor"; the label now follows its
  sibling buttons' pattern ("Send to editor: the package", like "Print /
  PDF: the editor's package").
- **breakdown-categories-phone, desktop row 38px — real app bug.**
  `breakdownView.module.css` sized the category editor's fields with
  `.edRow .input`, but the fields carry the *Studio* module's `.input` class —
  a different hashed name this module can never select, so the 44px rule was
  dead and only the touch media query (44px on coarse/≤760px) masked it on
  phones. The rule now selects the element.
- **breakdown-categories-phone, readiness link — stale test.** The href
  assertion used the regex `/editor?script=/`, which can never match the
  real href `/editor?script=…` (the `?` is unescaped). The app's href was
  right; the regex now escapes it.
- **task-edit (textbox never appears) — stale test.** The task editor is
  `MentionInput`, an ARIA combobox (its @ picker), so `getByRole('textbox')`
  waited the full 2 minutes. The spec now asks for the combobox.
- **view-as (status strict mode) — stale test.** The island carries a
  visually hidden `role="status"` live region on every suite page, so the
  spec's unscoped `getByRole('status')` resolves to 2. It now filters by the
  banner's text.

**Not fixed here (need a local-stack reproduction first, per RULES):**
island-call (the island's Community link never becomes clickable in the
spec's 40s retry loop after joining a voice room — both attempts, Nov 24 and
Nov 26 nights; flaky/regression boundary around #751's island rework) and
phone-keyboard's Lounge composer case (deterministic in run 45826552054,
both retries; the Settings cases in the same spec pass, and #763 rewrote the
Lounge's height rules the same week — the exact geometry needs the stack,
not a blind CSS edit). Both stay on #731.

**Verified:** `npm run typecheck` (app + e2e configs), `npx eslint` on every
changed file, `npm run test` (unit) — see the PR's Verified line for results.
Not verified: the e2e specs themselves — this environment has no Docker, so
the local Supabase stack cannot run; the fixes are proven at code level
against the nightly log's exact errors and must be confirmed by the next
nightly (or a stack session).
