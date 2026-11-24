# Session - 2026-11-24: stuck page scrolling, and the Rainbow theme

**Scroll.** The owner saw pages that would not scroll, or scrolled as a whole page, after dialogs and sheets. Cause: four surfaces (studio modal, phone menu sheet, Capture, board slideshow) each saved `body.style.overflow`, set `hidden` and restored the saved value; when two overlapped the second saved `hidden` and restored it last, locking the page. They now share `lib/ui/scrollLock.ts` (a count, restored once when the last holder lets go), with a unit test of overlapping holders.

**Rainbow theme** (`rainbow`, dark): clear glass surfaces over a slowly moving colour wash; `--mc-hue` (a registered `@property`) turns every 14 s and drives the accent and the outlines. Static hex fallbacks sit in the first block (the swatch test reads them); still under reduced motion, opaque under reduced transparency.

**Verified:** typecheck, lint, theme and scroll-lock tests. **Not verified:** not looked at in a browser, and the split-pane/island overlap in the owner's screenshots (island pill over page content, Lounge/Script panes) is not investigated: BACKLOG item to pick up.
