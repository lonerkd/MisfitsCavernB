# The Tools sheet clears the open deck

Owner shot, Nov 27, 2026: the editor's Tools sheet open on "Music
for this scene", the island deck expanded over its foot — the last
track rows (N'Devious, "Fucking Your Culture") hidden behind the
deck, unreachable.

## Cause

BottomSheet reserved only `--taskbar-height`, the island's
*resting* footprint. That reserve is deliberate for pages — the
code says so: the height "stays put while the island opens; that
overlays, it doesn't reflow." But a modal sheet is not a page: its
content cannot scroll out from under the overlay, so with the deck
open (roughly twice the resting height) the sheet's last rows were
trapped behind it.

## Fix

- `EcosystemTaskbar`'s existing island measure (the ResizeObserver
  behind `--island-room`) now also publishes `--island-height` on
  the root: the island element's full current height, deck
  included, kept current as the deck opens and closes. The resting
  `--taskbar-height` is untouched.
- `BottomSheet`'s foot padding takes the taller of the two:
  `max(var(--taskbar-height), var(--island-height) + 14px)` — the
  14px is the dock's own offset from the screen foot. Closed deck:
  the resting reserve wins, exactly as before. Open deck: the sheet
  ends above it and every row scrolls clear.

Every BottomSheet gets it (the editor's Scripts / View / Tools /
More sheets are the four riders). Pins:
`components/phone/bottom-sheet-island.test.ts`.
