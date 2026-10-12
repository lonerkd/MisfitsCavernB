# Session — 2026-10-12: the editor page, thinning 1 (restructure phase 7)

`app/(suite)/editor/page.tsx` 1,430 → 1,351 lines. Moves only, no behaviour change:
- import and export out to `components/editor/useScriptFiles.ts` (`useScriptImport`, `useScriptExport`);
- dual dialogue's text rule out to `lib/scriptos/dual.ts` (`toggleDualCaret`, pure, with 3 unit tests).

**Verified:** typecheck, eslint, 925 unit tests; on a real build against the local stack, the editor specs (find & replace and casting, undo, gutter, reading corrections) pass; `beat-to-script` failed once and passed on its own re-run (flake). **Not verified:** CI (billing).

**Left for phase 7:** the key handler, autocomplete and caret code (~200 lines), scene reorder, the split-screen and Pill publishing effects, `openProjectScript`.
