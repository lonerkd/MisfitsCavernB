# 2026-11-26 — Lounge layers you can leave, a back that goes back, a bar that steps aside on focus

Four owner reports from one phone session in the Lounge:

1. **The search panel was a trap.** It starts at the very top of the screen
   (its header and close button under the status-bar clock), spans 94vw with
   no backdrop, and reads as a giant empty sheet. The Lounge's side panels
   now share a `SidePanel` shell: the panel starts below the safe-area top,
   a scrim behind it takes a tap to close (phones; on a desk there is no
   scrim), and the thread panel gets the same scrim.

2. **Back went to the Projects page from inside a Lounge search.** Back is
   now layer-aware: open layers (Lounge search/pinned/thread, Capture)
   register on a small overlay stack (`lib/os/overlayStack.ts`), and both
   bars' back chevrons — the pill's and the island's — close the topmost
   layer before they navigate anywhere. Back means "where I just was", and
   a layer sits over where he just was.

3. **The ANNOUNCE badge rode over the header's buttons.** The channel name
   could not shrink (no truncation on the span), so the badge landed on the
   members/search buttons. The name now ellipsizes, the badges never
   shrink, and the button cluster never compresses.

4. **Opening a textbox dragged the bottom bar up, then it fell behind the
   keyboard.** The step-aside was measured: the covered height only exists
   once the keyboard has risen, so the bar rode the rise and dropped at the
   120 px threshold. `barAside` (lib/os/usePhone.ts) is now a small state
   machine led by focus — aside the moment a field takes focus, confirmed
   by the measurement, released when the keyboard has mostly gone or on
   blur. The pill and `PhoneKeyboard`'s `data-typing` (the island, the
   Lounge's typing layout) run the same machine. `phoneState` is untouched:
   the editor's own typing frame still keys off the measured height.

No database changes. The owner's phone is the proof for all four.
