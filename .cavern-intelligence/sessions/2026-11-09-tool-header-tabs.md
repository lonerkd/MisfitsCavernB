# Session — 2026-11-09: the Studio's tabs on the shared header, and Print in the header (slice 4)

The Studio's tabs — Overview, Scene References, References & Media, Post, Share & Pitch, Promos — open with the shared tool header through a new `tool` option on `SectionHeader` (the card look is opt-in because the editor's side panels use the same component outside the Studio). The title stays an h2 with its id, so each section still labels itself. A record tool's Print / CSV, which the Production tab drew as a lone button above the view, now sits in that tool's own header: the tab supplies it through `ToolActionsContext` and `ToolHeader` renders it beside the tool's own actions, so none of the 27 views had to change.

**Verified:** typecheck, lint, the whole unit suite (309 files, 2671 tests), a new test for the context and for `SectionHeader`'s two looks. **Not verified:** on screen in Paper and Misfit.
**Left (BACKLOG 3.47):** the project page's own tools (pitch, beat board, the editor's rail), Day out of days' header inside its card, the split bar's picker, the shared scene card, a browser spec.
