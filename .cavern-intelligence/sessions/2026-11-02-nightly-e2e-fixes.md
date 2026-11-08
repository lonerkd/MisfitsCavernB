# Session — 2026-11-02: the nightly e2e run, fixed where it was ours

The scheduled `e2e-local` run had been red since 30 Oct. Read the 1 Nov run's failures (8 distinct specs) and ran each on a rebuilt local stack.

**Fixed (and re-run green):**
- **Accessibility, and the stripboard's Daylight spec** — the strip status button was 18 px, under WCAG 2.2's 24 px target size (`stripboard.module.css`). Now 24 px. `accessibility.spec.ts` (every page) and `daylight.spec.ts` pass; the Daylight stripboard test failed on the same axe check.
- **`admin-formats.spec.ts`** — the format form gained a second group of phase checkboxes (client approval gates) with the same labels, so `getByLabel('post-production')` matched two. The test now scopes to the "Skips" group. The page is right as it is (each group has a legend).
- **`breakdown.spec.ts`** — the drag of a strip to "A new shoot day" ran in a 720 px window where the drop zone is off screen after the Schedule hint banner was added. The step now uses a taller window.

**Passed on a clean run here, so flaky not broken:** `projects-keyboard-phase`, `editor-keyboard-reorder`, `editor-safety-net`.

**Not fixed, and why:** `editor-cowriting` "typing at the very same spot" fails about 1 in 4 repeats, and the failure is real corruption (a typed character ends up at the end of the document). It is recorded in BACKLOG 3.33 with the evidence; the test is left as it is, because loosening it would hide a product bug.

**To run these specs in this container:** the stock Playwright `page`/`browser` fixtures need ffmpeg for video, which is not installed; a one-off config with `video: 'off'` runs them.
