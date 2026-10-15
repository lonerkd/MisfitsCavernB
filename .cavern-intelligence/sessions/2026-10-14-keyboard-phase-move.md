# Session — 2026-10-14: a project's phase can be changed from the keyboard

**Changed:** on the Projects board, Alt + ← / → on a project card moves it to the previous or next phase (the same move as dragging it), and focus follows the card (`stepTarget`, `focusSelector` in `lib/util/reorderKeys.ts`; test in `reorderKeys.test.ts`). E2E `e2e/projects-keyboard-phase.spec.ts` presses twice in a row each way, 8/8 runs.

**Found on the way:** after a move the old card stays on screen for about half a second and still takes key presses with the phase it was drawn with, so a quick second press went from the old phase. The page now remembers where a card was just sent for 1.5 s (`movedTo`); a failed move forgets it.

**Still drag-only:** the Studio shot designer. The stripboard has keys already; unchecked by hand.

**Verified:** unit tests, typecheck, lint, the e2e (8/8). **Not verified:** CI, screen readers.
