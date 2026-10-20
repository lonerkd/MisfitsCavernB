# Session — 2026-10-20: green baseline and gated salvage of the eco worktrees

**Found:** `claude/eco-consolidation` was red (7 type errors, 2 lint errors, 9 failing tests): an older worktree copy of `lib/supabase/stats.ts` and the admin page had overwritten the newer committed versions. 88 eco worktrees (outside the repo, under `MisfitsEcosystem/data/worktrees`) held 337 uncommitted files; 170 `claude/eco-job_*` branches, only 19 with commits.

**Changed:** restored the newer stats loader and admin page; kept the retrying `useProjectProgress` (lint justification added); a whitespace-only shared script now reads as empty; two crew-page test expectations corrected. Then each worktree's files were replayed one at a time onto `claude/eco-salvage` by a three-way merge, kept only if `tsc`, `eslint` (changed files) and the full `vitest` suite stayed green: 42 worktrees kept (134 files), 18 rejected (6 type errors, 12 test failures), 7 empty. Skipped: 34 merge conflicts, 5 migrations (need a persona test and the owner), 8 files removed on the baseline, 4 added differently.

**Held for the owner:** `job_957d4a3b` (legal identity read from eight `LEGAL_*` variables, build throws if unset) was reverted — it breaks the build and the Vercel deploy until the variables are set in every environment.

**Verified:** `npm run typecheck` clean, `npm run lint` 0 errors (1 old warning), `npm run test` 1426 passed, `npm run build` succeeds. **Not verified:** e2e, integration tests (no database), the 5 skipped migrations, the Vercel build.

**Open:** the 18 rejected worktrees and 34 conflicting files (retry with the local models); delete the 49 covered worktrees/branches only with the owner's OK. Audit data and scripts live in `MisfitsEcosystem/scripts/` and `data/salvage-*`.
