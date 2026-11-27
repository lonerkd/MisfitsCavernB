# 2026-11-26 — The Capture sheet moves

The owner's annotated shot of the Capture sheet (Nov 26): a drag arrow
drawn over it, "make this more sensitive and easier to move, it's so
rigid." He was being generous — the sheet had no drag at all. Its grip
was decoration; the only ways out were the × and the scrim.

The More sheet has had the real thing all along: a pointer drag on the
grip-and-title zone, the sheet following the finger from the first
pixel, dismissal decided by shared maths in `sheetDrag.ts`. Capture
now carries the same drag, the same zone, the same maths — one sheet
behaviour everywhere, instead of one sheet that moves and one that
doesn't.

No database changes. The owner's thumb is the proof.
