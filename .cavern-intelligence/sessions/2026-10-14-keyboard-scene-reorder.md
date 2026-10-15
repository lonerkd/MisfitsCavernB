# Session — 2026-10-14: scenes can be reordered from the keyboard

**Found:** the editor's scene list (left nav) and the beat board reorder only by dragging. The board's cards could not even be focused. (The audit missed them: it looks for a pointer cursor and these use `grab`.)

**Changed:** `lib/util/reorderKeys.ts` — Alt + ↑/↓ (or ←/→) moves a scene one place, Alt + Home/End to the ends; focus follows the scene (it is put back for up to a second because the list rebuilds after the script is rewritten). Wired into the scene list and the board (cards are now focusable, Enter opens the scene); the hover text and `aria-label` say so. E2E `e2e/editor-keyboard-reorder.spec.ts`: moves down, checks focus, moves back; 10/10 runs.

**Still drag-only (found by search, not yet fixed):** the Projects page phase columns (drag a project card to change phase), the Studio shot designer, and the stripboard's drag (it already has keys — to be checked by hand).

**Verified:** 1006 unit tests, typecheck, lint, the e2e (10/10), keyboard audit (0 findings). **Not verified:** CI, screen readers, the board view by hand.
