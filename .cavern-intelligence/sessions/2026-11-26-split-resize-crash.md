# Split: dragging the divider no longer kills the page

Owner, Nov 26, 2026: "Every time I try to adjust the frame size in either
mobile or desktop it crashes" — the web view's "This page couldn't load"
screen, both platforms, every drag.

## Cause

The divider's `onPointerMove` committed every move to React state
(`update({ ratio: ratioAt(...) })`). Each commit re-rendered the split
page — both panes are full app pages in iframes, so both relaid out per
move — and ran the layout effect, which rewrote the address bar
(`history.replaceState`) and localStorage and re-paired the panes, per
move. A drag is dozens of moves a second; the page died under it. A
pointer capture lost mid-drag also had no `pointercancel` path, so
`dragging` could stick.

## Fix (`app/(suite)/split/page.tsx`)

- A move now only paints: it writes the wrap's `gridTemplateColumns` /
  `gridTemplateRows` directly and keeps the ratio in a ref; the
  separator's `aria-valuenow` follows.
- The ratio commits once — state, address, storage — when the drag
  ends (`finishDrag` on pointer up AND pointer cancel).
- Releasing the capture is guarded by `hasPointerCapture`.
- Keyboard resizing is unchanged (discrete steps commit per keypress,
  which was never the problem).

Pins: `components/split/resize-drag.test.ts`.

## Verified

Locally: the pin suite plus the split lib suites; typecheck and lint on
the touched files. The drag itself wants the owner's hand on a real
phone after deploy — the crash was his report, so his retest is the
proof.
