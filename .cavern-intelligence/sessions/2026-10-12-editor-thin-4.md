# Session — 2026-10-12: the editor page, thinning 4 (restructure phase 7)

`app/(suite)/editor/page.tsx` 1,215 → 1,186 lines. Two more pure functions in `lib/scriptos/sceneviews.ts`: `sceneAtCaret` (which scene the caret is in) and `actStructure` (the three-act split by words), with 2 unit tests that pin the existing behaviour (the act split for eight equal scenes is 3 / 7 — checked against the original code, not assumed).

**Verified:** typecheck, eslint, 944 unit tests; gutter, table-read, readiness and undo specs on a real build. **Not verified:** CI (billing).

**Left for phase 7:** the split-screen, cut-note jump and Pill effects (interdependent hooks — better extracted as one `useSceneNavigation` hook with its own tests), `openProjectScript` / loading, the shortcut effect. The page is 1,186 lines against 1,610 when the editor work began.
