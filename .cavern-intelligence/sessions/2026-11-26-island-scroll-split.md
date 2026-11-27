# Island: a scrollable strip, and the split button becomes a choice

Owner, live on his phone (Nov 26, 2026): the island's strip wrapped to two
rows to fit a phone — "make it horizontally scrollable so it's not two row";
his pick of the shapes offered: pinned ends, a scrollable middle. In the same
burst: "maybe also a setting to remove split screen button", then three shots
of split panes squeezing two pages into a phone, then word that dragging a
split's frame size crashes the page on mobile and desktop both (that crash is
its own fix; this PR is the island half).

## What changed

- `components/island/island.module.css` — the two rules that wrapped the
  strip (the compact surface, and the sideways-phone block from the deck-fit
  PR) now keep it one row: `flex-wrap: nowrap`, start-aligned so the first
  item is reachable, `overflow-x: auto` with the scrollbar hidden and
  overscroll contained. The bar's ends never moved: the face row (back,
  title, Capture) was already pinned nowrap when collapsed.
- `components/shell/EcosystemTaskbar.tsx` — when the route changes, the
  strip centres the current app instead of leaving it off the edge; and the
  split-screen slot renders only when the device's choice shows it.
- `lib/island/splitButton.ts` (+ tests) — the choice, per device like the
  island's size: an explicit Settings choice wins everywhere; unset means
  OFF on the compact surface (the panes squeeze there — his shots) and on
  elsewhere. The Ctrl+\ shortcut is not the button and is untouched.
- `app/(suite)/settings/page.tsx` — a "Split screen button" disc switch in
  Appearance, beside Island size, showing the effective state on this
  device.
- Pins: `components/island/island-scroll.test.ts`; the lib's own tests
  cover the choice's truth table and storage round-trip.

## Not in this PR

- The split resize crash (dragging the divider re-renders both framed
  pages per pointer move and rewrites the address each move) — separate fix.
- Why panes look worse than they did ~a month ago: the min-font floor lost
  its width gate Oct 11 (#153), 44px targets + 16px fields went global for
  touch Nov 7 (#445), frost blur spread Nov 8 (#529/#532/#534) — each lands
  twice inside a pane, whose window is the pane. Recorded for the scale
  audit; no behaviour changed here.
