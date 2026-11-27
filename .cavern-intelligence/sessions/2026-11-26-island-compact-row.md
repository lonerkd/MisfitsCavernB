# 2026-11-26 — The collapsed compact island is one row

The owner's first phone trial of the island (four screenshots, Nov 26):
Home's collapsed pill is right, the open deck renders the editor's and
Studio's context beautifully — but in the editor the COLLAPSED island
wrapped: "Winter Quarters — final · Scene 4/4" on one row, the Capture +
alone and centred on a second row, the panel eating two rows of script.

`.main` and `.inline` wrap by design (the desktop island centres its
controls across lines when it must). On a phone, collapsed, that wrap is
wrong: the pill this surface replaced was one row. Compact + not-open now
pins both to nowrap — the title truncates (already its rule), the fields
shrink (already capped), Capture (flex: none) stays at the row's end.
The open deck is exempt: stacking is its shape, and the trial shots of
it are right.

CSS only; no database changes. The owner's phone is the proof.
