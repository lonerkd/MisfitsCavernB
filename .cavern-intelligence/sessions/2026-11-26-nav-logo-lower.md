# 2026-11-26 — A slim home nav: the mark tucked under the clock

The owner's annotated screenshot of Home (Nov 26, 22:34): the fixed nav
is a tall, mostly-empty band — mark floating mid-band, content pushed
down. His edit circles the top-left corner: the mark belongs up there,
tight under the clock, in a bar that takes as little screen as possible.
"We're trying to gain mobile real estate."

An earlier commit on this branch went the wrong way (more padding =
a bigger bar). This is the correction: on phones the nav's clearance
comes from the safe-top inset alone, with 6px of air above the row and
6–8px below it. Desktop keeps its original pads (its inset is 0 and
screen is not scarce there).

No database changes. The owner's phone is the proof.
