# Session — 2026-10-27: validate festival submissions

**Changed:** `getProductionData` now ignores malformed `festival_submissions`
entries, keeping only rows with string ids and names and a known status.
Optional deadline and notes are retained only when strings. Added a mixed-list
unit test and removed the completed item from `BACKLOG.md`.

**Verified:** the project-hub tests pass (21/21), the full suite passes
(1,667 tests), typecheck and production build pass. Lint passes with one
pre-existing warning in `lib/hooks/useProjectProgress.ts`.
