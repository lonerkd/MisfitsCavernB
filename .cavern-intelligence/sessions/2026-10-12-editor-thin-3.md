# Session — 2026-10-12: the editor page, thinning 3 (restructure phase 7)

`app/(suite)/editor/page.tsx` 1,258 → 1,215 lines. The scene views left the page as pure functions in `lib/scriptos/sceneviews.ts`: where each heading sits in the text, moving a scene (reorder), the INT/EXT/DAY/NIGHT filter, and per-scene word counts and speakers — 5 unit tests. One small hardening: a reorder to or from an index past the last scene is now refused instead of corrupting the script. Names downstream are unchanged.

**Verified:** typecheck, eslint, 942 unit tests; editor, gutter, table-read and readiness specs on a real build pass. **Not verified:** CI (billing); dragging scenes in the outline in a browser (no spec drives it; the move itself is unit-tested).

**Left for phase 7:** the split-screen and Pill publishing effects, `openProjectScript` / loading, the keyboard shortcut effect, the cut-note resolver.
