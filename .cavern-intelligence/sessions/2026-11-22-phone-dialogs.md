# 2026-11-22 — Dialogs keep clear of the notch and stack their header (3.41)

**What.** The owner's iPhone screenshots of "Storyboard frame for shot 1.1": in portrait the title wrapped to three lines with Upload, Add link and Use as frame stacked beside it and poking above the dialog; the search placeholder was cut off; in landscape the camera cut-out covered the dialog's left edge.

**Changed.**
- `components/studio/studio.module.css`: the shared Studio `Modal` (`.modalHead`) wraps on a phone (<= 760 px): the title takes its own line(s) (`overflow-wrap: anywhere`), the actions wrap in one row under it; the library search is full width. The backdrop padding is now `max(24px, env(safe-area-inset-*))` on all four sides.
- `components/studio/media/MediaGrid.tsx`: placeholder "Search library" (the full phrase stays as `aria-label`).
- Other dialogs with the same full-bleed pattern, checked: the camera dialog scrim (`shots.module.css`) and the unlock reveal backdrop (`progress.module.css`) fixed the same way; the board slideshow and the phone bottom sheet already used the insets.
- Desktop unchanged: the `max()` resolves to the old padding where the insets are 0, and the stacking is only under 760 px.

**Ran.** `npm run typecheck` clean; `npx vitest run components lib` 421 files passed, 3393 tests; `eslint` on the changed files clean (the whole-repo `eslint .` segfaulted in this Node 24.14 build on Windows, so CI is the full lint); `npx playwright test e2e/phone-dialogs.spec.ts e2e/mobile.spec.ts` 6 passed on the local stack. The new spec opens the real picker at 390x844 and 844x390: every action inside the dialog and under the title block, search at least 60% of the dialog, no sideways scroll, the safe-area `max()` present on all sides.

**Not verified.** No real iPhone; the safe-area insets are only checked as a rule present in the stylesheet (Chromium reports 0). Other `Modal` users were not each walked by eye.
