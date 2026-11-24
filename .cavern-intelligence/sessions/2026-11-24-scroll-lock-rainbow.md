# Session - 2026-11-24: stuck page scrolling, and the Rainbow theme

**Scroll.** The owner saw pages that would not scroll, or scrolled as a whole page, after dialogs and sheets. Cause: four surfaces (studio modal, phone menu sheet, Capture, board slideshow) each saved `body.style.overflow`, set `hidden` and restored the saved value; when two overlapped the second saved `hidden` and restored it last, locking the page. They now share `lib/ui/scrollLock.ts` (a count, restored once when the last holder lets go), with a unit test of overlapping holders.

**Rainbow theme** (`rainbow`, dark): clear glass surfaces over a slowly moving colour wash; `--mc-hue` (a registered `@property`) turns every 14 s and drives the accent and the outlines. Static hex fallbacks sit in the first block (the swatch test reads them); still under reduced motion, opaque under reduced transparency.

**Verified:** typecheck, lint, theme and scroll-lock tests. **Not verified:** not looked at in a browser, and the split-pane/island overlap in the owner's screenshots (island pill over page content, Lounge/Script panes) is not investigated: BACKLOG item to pick up.

**Mobile audit.** `mobile-audit` had been red since #749 folded the project switcher into the tab row (the page content moved up 58px, so one control per route now sits behind the phone's bottom pill at scroll 0: the Go link, Open scene, Upload files, Go: Write the logline). Reproduced locally; scrolled to the end of every studio tab the lowest control stops 150 to 220px above the pill, so nothing is unreachable. Four baseline entries (portrait overview, scenes, library, onset) raised from 0 to 1 on purpose, not a layout fix.
