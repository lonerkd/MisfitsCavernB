# Session — 2026-10-28: Archived badge on Library grid cards (#326)

With "Show archived" on, archived items looked like working ones. `MediaGrid` now shows an "Archived" tag (`tagArchived` in `studio.module.css`) on cards whose `media.lifecycle` is `archived`, only when the `phase_gates` flag is on.

**Verified:** `components/studio/media/MediaGrid.test.tsx` (archived marked, working not, flag off shows nothing); typecheck, lint, tests and sync-intel run before the PR.
