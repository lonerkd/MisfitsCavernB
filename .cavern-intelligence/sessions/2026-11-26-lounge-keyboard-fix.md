# 2026-11-26 — The Lounge composer goes under the phone keyboard

**Owner report (2026-11-26):** on mobile, "the stuff that's supposed to sit above the keyboard still gets pulled under it."

## What was wrong

Two faults, both in how the Lounge room is sized while typing:

1. **The room's height was derived, not measured.** While typing, `.mc-lounge` was `100dvh - safe-top - var(--kb)`, where
   `--kb` is the covered amount computed as `innerHeight - visualViewport.height - offsetTop`. In a browser that resizes the
   layout viewport for the keyboard (an in-app webview, the installed app) — or where `dvh` lags that resize — the covered
   amount reads as **zero** with the keyboard up, so no shrink ever happened and the composer stayed at the foot of a
   full-height room, under the keyboard. The keyboard's top edge is directly measurable from the visual viewport
   (`height + offsetTop`); the fix measures it instead of deriving it.
2. **The fixed chrome never gave way in portrait.** When the room did shrink, nothing compressed: the welcome banner stayed,
   and the chat column kept reserving the island's height (`--taskbar-height`) under the composer even though the island
   hides while typing. Once the shrunken room is shorter than the fixed pieces, the message pane floors at zero and the
   composer spills past the room's foot — clipped by the chat column, half-buried at the bottom edge. (Sideways already
   stepped its chrome aside while typing; portrait never did.)

The nightly `phone-keyboard` spec has failed on exactly this test ("the Lounge composer sits on top of the keyboard, not
under it") every run — the failure screenshot for 2026-11-26 shows the composer clipped at the visible area's edge.

## The fix

- `PhoneKeyboard` now also publishes `--vvh` on a phone: where the visible area ends, in layout-viewport coordinates
  (`visualViewport.height + offsetTop`, the keyboard's top edge when it is up; the full height when it is down).
- The Lounge's phone heights (portrait and sideways, typing and not) are sized from `var(--vvh, 100dvh)`. While typing the
  room is exactly `--vvh - safe-top`, so the composer lands flush on the keyboard's top edge in every browser mode.
- While typing in portrait, the welcome banner steps aside and the chat column drops the island reserve
  (`padding-bottom: 0`), mirroring what sideways already did with its top bar and chat header.

## Verified

- A standalone replica of the room (same structure, same CSS rules, the spec's own fake `visualViewport`) driven in
  Chromium: before the fix the composer box ended past the keyboard line and painted clipped at the room's foot (the spec's
  poll fails); after the fix it ends flush at the line (the poll passes).
- Unit tests: `LoungeKeyboard.test.tsx` covers the `--vvh` publishing (down, up, and with a scrolled visual viewport) and
  pins the new CSS rules.
- Not run here: the opt-in `e2e/phone-keyboard.spec.ts` (needs the local stack, `E2E_LOCAL_STACK=1`) — the nightly runs it,
  and the owner's next Lounge typing session on his phone is the live proof.
