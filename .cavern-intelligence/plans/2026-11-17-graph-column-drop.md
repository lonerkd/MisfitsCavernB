# Dropping the film graph's old text columns: the plan (2026-11-17, for the owner's decision)

BACKLOG 3.18 (e), step 5 of [2026-10-27-graph-cutover-audit.md](2026-10-27-graph-cutover-audit.md). Dropping a column destroys data
and cannot be rolled back by a deploy, so nothing here is applied until the owner says yes (RULES 7). This note measures what each
column still is, so the owner decides on facts.

## What each column is today

| Column | The graph's replacement | Still written by | Verdict |
|---|---|---|---|
| `scenes.cast_list` | `scene_characters` | `lib/studio/scene-sync.ts` (derived from the script on every sync) | **A true duplicate.** Drop, after the readers below move. |
| `scenes.location` | `scenes.location_id` | scene-sync (the heading's place); **the trigger reads it to set `location_id`** | **Not a duplicate: it is the input.** The heading's text is what a writer types; the link is derived from it. Keep. Make the id the *read* truth (done for the production tools, 2026-11-02); do not drop. |
| `scenes.shoot_day`, `call_sheets.shoot_day` (integers) | `shoot_day_id` | the stripboard and call sheets (a person moves a scene to "day 3"); **the trigger reads it to set `shoot_day_id`** | **Not a duplicate: it is the input and the number people say.** Keep. |
| `call_sheet_calls.character_name` | `character_id` | the call sheet; an issued sheet snapshots it | **Keep as the printed label.** An issued call sheet must show the name it was issued with, even after a rename. |
| `character_castings.character_name` and the casting history, auditions, credits, jobs | `character_id` where a character exists | casting, jobs (a casting call can be posted for a character the script does not have yet) | **Keep.** The name legitimately comes before the character. |

**So the honest scope of "drop the text columns" is one column: `scenes.cast_list`.** The other four are inputs or printed labels,
not stale copies. The audit's step 5 listed all four; measuring the code and the database triggers shows only the first is safe
and useful to drop. This is the recommendation; the owner may still choose to keep `cast_list` too (the cost of keeping it is the
second source scene-sync writes, which the graph must win over).

## The plan for `scenes.cast_list` (if the owner says yes)

**Before any change (read-only, on production and staging):**
1. `select count(*) from scenes s where btrim(coalesce(cast_list,'')) <> '' and not exists (select 1 from scene_characters c where c.scene_id = s.id)` must be **0**: no scene knows its cast only from the text. If it is not 0, run the backfill (`20261011010000_film_graph_people_in_scenes.sql` derives the links) for the remainder first.
2. Take a copy: `create table internal.cast_list_backup as select id, project_id, cast_list from scenes where cast_list is not null` (kept 30 days; the only way back, because a dropped column is gone).

**The change (one PR, branch `claude/drop-cast-list`):**
- Readers first, each tested: `lib/film/cast.ts` (`castOfScene` loses its text fallback), `lib/studio/stripboard.ts`, `lib/studio/readiness.ts`, `lib/today/director.ts`, `lib/supabase/today.ts`, `lib/studio/api.ts` (the call-sheet scene query), `components/studio/StudioContext.tsx`. After this `grep -rn cast_list app components lib` finds only `scene-sync.ts` and the types.
- The writer: `scene-sync.ts` stops deriving `cast_list` (the links it already writes are the truth).
- The migration `YYYYMMDDHHMMSS_drop_scenes_cast_list.sql`: `alter table scenes drop column cast_list`; check no view, function or policy names it (`pg_depend`), rewrite any that does in the same file. Snapshot, `database.types.ts`, and the persona test `film-graph-people.test.ts` (an owner's scene keeps its cast through the links; an outsider reads none) in the same PR.
- Verification: the full unit suite, `film-graph-*` integration tests, `e2e/readiness-day-date.spec.ts`, `e2e/onset-offline.spec.ts` (it caches scenes), the stripboard conflict spec, and the call page `/call/[id]` (an outsider surface: it must still show only what a call sheet link may).

**Applying it:** merge, apply the migration to production by hand, then staging, then the drift check (`database-and-security.md` §3). Apply from the file exactly as written.

**Rollback:** `alter table scenes add column cast_list text; update scenes s set cast_list = b.cast_list from internal.cast_list_backup b where b.id = s.id;` then revert the PR. The backup table is why step 2 is not optional.

**Size:** M (a session). **Risk:** low once the pre-check is 0; the readers have been on the links since 2026-10-27.

## What the owner decides
1. Drop `scenes.cast_list` (recommended), or keep it.
2. Confirm the other four stay (recommended), so BACKLOG 3.18 (e) is rewritten as "done once `cast_list` is gone".
