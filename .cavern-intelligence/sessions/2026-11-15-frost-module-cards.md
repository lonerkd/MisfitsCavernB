# 2026-11-15 — Frosted mode: the CSS-module cards (3.48)

Audited every CSS-module rule that paints with a solid `var(--bg-2)` / `var(--bg-3)`: nine. Only one is a resting, non-modal surface that was still opaque, the floating "Continue from your other device" offer (`.continueFloat`). It now takes the frost with the same pattern as `app/globals.css` (`--frost-tint` / `--frost-lift` mix, `backdrop-filter: var(--frost)`), inside `prefers-reduced-transparency: no-preference` and an `@supports backdrop-filter` guard, so it stays opaque under reduced transparency or without blur.

The other eight stay solid on purpose (modals, the bottom sheet, the board canvas and image backing, a data swatch, a native option list); each is recorded with its reason in BACKLOG 3.48.

**No visual check was done**: this was not looked at on screen in any theme or on a phone. The tokens test and the checks below were run.
