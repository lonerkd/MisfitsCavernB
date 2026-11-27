# Readiness: one line per blocker (Production overhaul P0.5)

Owner, Nov 26, 2026, over the Production tab's Readiness panel in
portrait and landscape: the tabs and the panel moving together is
right, "but it takes up a lot of real estate." Every blocker was a
full block — kind label in its own grid column, title, paragraph,
button — so eleven blockers were eleven screens of scroll, and in
landscape the "Blocking" labels rendered outside the card's left
edge.

## What changed

- **Compact rows** (`components/studio/production/BreakdownFocus.tsx`,
  `breakdownView.module.css`): a row is one line — kind, title, the
  fix-it action — and the detail paragraph lives behind a tap on the
  row (chevron, `aria-expanded`). The kind rides inside the line as a
  small chip, never in a separate grid column, so nothing can render
  outside the card at any width. The old phone single-column collapse
  is gone; the row is the same shape everywhere.
- **Casting speaks once** (`lib/studio/breakdown-focus.ts`): "Cast a
  role" is contained in "Cast every role in the film" — when both are
  owed, the weaker item stands down. The stricter item also gets real
  numbers now ("0 of 2 characters in a scene cast", from
  `cast_roles_cast` / `cast_roles`) instead of the milestone's hint
  sentence.

## Tests

- `lib/studio/breakdown-focus.test.ts`: the dedupe (none cast, partly
  cast) and the new detail text.
- `components/studio/production/BreakdownFocus.test.tsx` (new): rows
  render title + action with details hidden, the toggle opens and
  closes the numbers, in-tab actions still fire.

## Verified

Locally: both suites, eslint, typecheck, bible. The row height on a
real phone — five blockers should now sit in a third of the screen —
is the owner's eye after deploy.
