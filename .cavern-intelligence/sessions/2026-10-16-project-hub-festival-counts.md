# Session — 2026-10-16: the project page counts festivals the way the database does

**Checked:** every field the project page (`/projects/[id]`) reads through `getProjectRow` and `getProjectOverview` against `database.types.ts` — all exist (`projects.festival_submissions` is `jsonb`, default `'[]'`, no constraint). `get_project_progress` counts festivals as `f->>'status' in ('submitted','accepted')` over the list, treating a non-list column as empty.

**Found:** the page cast the jsonb list to `{ status?: string }[]` and read `f.status` on each entry — one `null` in the list threw, and the page's numbers never loaded.

**Changed:** `lib/supabase/project-hub.ts` — `getProjectOverview` returns `festivalsSubmitted` / `festivalsAccepted` (submitted counts accepted too, as the database does), reading only entries that are objects with a string status; the raw `festivals` list is gone from `ProjectOverview`. The page uses the counts (and drops an unused `FestivalRow` import). Tests cover malformed entries and a non-list column.

**Not verified:** typecheck, lint, unit tests and build — this worktree had no `node_modules` and `npm ci` could not be run in that session. Run them before merging.

**Open:** `getProductionData` still casts `festival_submissions` to `FestivalRow[]` unchecked (BACKLOG 3.24).
