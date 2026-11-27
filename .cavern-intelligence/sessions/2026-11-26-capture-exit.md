# Capture: the sheet leaves by sliding home — on every close

Owner, Nov 26, 2026: closing Capture after opening it from the island
seemed to animate into the island, but closing it other ways didn't —
"is that on purpose or just random?" It was random. The sheet had no
exit animation at all: it unmounted on the spot. A drag-close only
*looked* animated because the finger carried the sheet down toward
the island before it vanished; the X, the scrim, Escape and the back
chevron were instant cuts.

## Fix (`components/mobile/Capture.tsx`)

- One close path, `requestClose`: it sets the sheet sliding down
  (translateY 105%, 240ms, the scrim fading with it), then calls the
  host's `onClose`, which unmounts. Reduced-motion devices skip the
  wait and close at once.
- Every dismissal takes it: the drag's dismiss, the X, the scrim,
  Escape, and the overlay stack (the bars' back chevron) — the stack
  now registers `requestClose` instead of the raw `onClose`.
- The one exception is "See the library", which navigates away; the
  route change closes the sheet itself, so it keeps the direct call.
- While the sheet is leaving it takes no new drags and no touches.

Pins added to `components/mobile/CaptureDrag.test.ts`.

## Verified

Locally: the mobile suites (CaptureDrag, sheetDrag, MobileTabBar),
typecheck, lint. The slide itself wants the owner's eye after deploy —
he's the one who spotted the inconsistency.
