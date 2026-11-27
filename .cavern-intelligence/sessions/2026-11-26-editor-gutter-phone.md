# 2026-11-26 — The scene gutter stays out of the phone's script

Scale audit S2, first fix. The owner's ScriptOS shots (Nov 26): the
gutter's Day/dusk/Shoot labels printed over the scene heading and the
action lines.

The gutter hid itself below a 720px layer width — but a landscape
phone's layer passes 720 while its text inset is still a phone inset,
so the labels (positioned for a desktop margin that isn't there) landed
on the text. The gate measured width; the real condition is the margin.
A phone never has the margin, at any width, so the gutter now also
stands down on phone layouts outright.

Nothing usable is lost: at phone sizes the labels were unreadable over
the script, and shoot days live canonically in the Studio's scenes and
breakdown. The component's old comment claimed "the scene card carries
it instead" — no scene card in the write view carries this read; the
comment now tells the truth.

No database changes.
