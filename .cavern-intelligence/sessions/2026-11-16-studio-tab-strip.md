# Session - 2026-11-16: the Studio's tab strip says it scrolls (BACKLOG 3.41)

**Seen in the screenshot pass:** on a phone the Studio's eight tabs scroll sideways, the last one is cut in half at the screen edge, and nothing says there is more. The active tab scrolls into view, so a person who never swipes never learns that Pitch and Share exist.

**Changed (no migration):** the strip fades on the side that still has tabs past it (`scrollEdges` in `lib/studio/scroll-edges.ts`, unit-tested; the Studio page tracks the strip's scroll and size and sets `data-more-left` / `data-more-right`; the fade is a CSS mask, so it follows any theme). Nothing shows when the row fits.

**The dots above each toolkit tile are not a bug:** they are the studs of the "Lego brick" tile (`components/progress/Bricks.tsx`, a deliberate motif), left alone. The **Early** tag now says what it means (a title and a screen-reader sentence: you have started on the tool before its phase opens).

**Verified:** unit tests, typecheck; looked at in a browser (see the PR). Not seen on a real iPhone.
