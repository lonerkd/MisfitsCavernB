# Session - 2026-11-16: fixes from the owner's phone walkthrough (BACKLOG 3.41)

**Source:** the owner's screen recording of a phone scroll-through (recorded 2026-11-07, sent in clips). Each finding was checked against `main` before being fixed.

**Already fixed on `main` (not changed):** the old "The Cavern Collection" portfolio headline (`lib/portfolio/header.ts`), the "Soundtrack" label (now Sound), and the Stats cards overflowing (a 2-column grid since #606).

**Fixed (no migration):**
- **The global 44 pt touch rule turned small controls into 44 px discs.** The Outline view's five scene-colour dots were huge circles squeezing the heading, and the Settings switches (push, comment replies, job alerts) looked like a bare disc, not a switch. Both now keep the button as the touch target and draw the dot or track inside it.
- **Preview on a phone:** the page kept 80 px side padding and the dialogue indents (about 25 characters), so a speech wrapped one word a line. On a phone the padding and indents shrink and the margin scene numbers are hidden (`compact` on `LinePreview`).
- **Plurals:** the character report said "1 lines", "1 scenes", "1 words".

**Verified:** unit tests for the editor and settings (85) pass, typecheck and lint clean. **Not looked at in a browser or on a phone**: these are layout fixes from the recording, so the owner's next phone pass is the check.

**Still open from the walkthrough (not yet checked against `main`):** the Everything sheet lists a project twice and lists a QA test project; Portfolio tile labels overlapping and the filter chips cut off; the music pill and project switcher cramped in landscape; the Studio tab row cut off; unexplained dots and an "Early" tag on Studio tiles; a long playlist inside the Community card; whether the Sound tab's Preview and save buttons clip; whether other `role="switch"` controls (about nine files) have the same stretch.
