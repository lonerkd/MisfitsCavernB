# Session - 2026-11-16: more fixes from the phone walkthrough, from the full recording (BACKLOG 3.41)

Source: the full 4 min 35 s screen recording (recorded 2026-11-07), sampled every two seconds (about 140 frames), after the first PR (the clips). Each finding was checked against `main`.

**Fixed (no migration):**
- **Preview's title page said "UNTITLED SCREENPLAY" over a titled script.** A title page nobody filled in now uses the script's own title (`withScriptTitle`; unit test). A title someone wrote is kept.
- **Every other switch** (the channel modal, the diff modal, production manager, the Studio's, the phase panel's, breakdown tag mode, frosted mode) had the same stretch into a disc as Settings: one global rule now lets a switch keep its drawn size (42 x 24, over WCAG 2.2's 24 px minimum); Settings keeps a 44 pt button around its track (`data-touch-target`).
- **The Everything sheet** lists each project's phase beside its name, so two projects with the same name can be told apart.

**Checked and not a bug:** the Lounge composer's "greyed" look in landscape (an empty box with its placeholder, and a Send button that is dim until there is text); the Portfolio "The Cavern Collection" headline and the "Soundtrack" label (already changed on `main`); the Stats overflow (a grid since #606).

**Not fixed, needs a browser or the phone:** tall blank gaps between sections of Settings in the Paper theme (in many frames, not tied to scrolling; no lazy placeholder found in the page); a white empty block while the Spotify embed loads in the dark theme (the iframe paints white; it needs a loading state); the music pill and the project switcher in landscape; the Portfolio showcase tile overlap; QA test projects showing in the owner's own project list (data: delete them, BACKLOG 3.37). Nothing here was looked at on a phone: unit tests, typecheck and lint only.
