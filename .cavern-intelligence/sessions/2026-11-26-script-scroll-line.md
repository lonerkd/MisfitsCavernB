# 2026-11-26 — The script's scroll line

The owner's editor screenshots kept showing a pale line down the
right edge of the phone, running the height of the screen and on
past the bars at the foot. "Still kinda fucked, look at the scroll
lines on the right."

The script is a textarea — it is its own scroller — and the global
scrollbar rule gives every scroller a 3px track. On the phone that
track is the line. The editor header already scrolls barless on
small screens; the script itself never got the same treatment.

Now it has: on a phone, either way up, the script area hides its
scrollbar (the house pattern — `scrollbar-width: none` and the
webkit bar off). Where he is in the script is the island's job: it
names the scene. The desk keeps its bar.

No database changes. The owner's phone is the proof.
