# Session — 2026-10-17: the parser → scene index boundary, checked and typed

**Asked:** check `lib/scriptos/types.ts` (`ParseResult`) against `lib/supabase/database.types.ts` for `z.infer` drift. No zod schema touches `lib/scriptos` — `ParseResult` reaches the database at one place only: `parseScript` → `planSceneSync` (`lib/studio/scene-sync.ts`) → `sync_script_scenes` (latest body `20260927040000_breakdown_memory.sql`) → `public.scenes`.

**Field by field (no structural mismatch):**

| Parser (`Scene`) | Plan (`ScenePlanRow`) | SQL | `scenes` column |
|---|---|---|---|
| `heading: string` | trimmed, ≤300, empty → `Scene N` | same rule, `N` = position | `heading text` |
| `location: string` | `string \| null` | `nullif(…,'')` | `location text` |
| `timeOfDay: string` | `UNKNOWN`/empty → `DAY` | empty → `DAY` | `time_of_day text` |
| `characters: string[]` | `', '`-joined or null | `nullif` → `scenes_link_cast` splits on `,` | `cast_list text` → `characters`, `scene_characters` |
| `eighths?: number` | `` `${max(1,n)}/8 pg` `` | `nullif` | `est_duration text` |
| `sceneNumber: string` | not sent | position | `scene_number integer` |
| `id`, indexes, `wordCount`, `elements` | not sent | — | (`elements` dropped by design) |

`ParseResult.characters` and `.elements` are never written; `script_characters` is written from `CharacterProfile` (`lib/scriptos/bible.ts`), not from parser types. Every cue name passes `clean()` (commas stripped), so the trigger's comma split cannot cut a name in two.

**Changed:** the boundary was safe only by hand — `ParsedSceneInput`, `IndexedScene` and `ScenePlanRow` were hand-written interfaces and the plan went to the RPC `as unknown as Json`. They are now derived (`Pick` of `Scene` and of `Tables<'scenes'>`), and the cast is gone, so a renamed/retyped column or parser field fails the compile. `studio-and-preproduction.md` §2 records it.

**Not verified:** this worktree had no `node_modules` and installing needed approval — `npm run typecheck`, `lint`, `test` and `build` were **not run**. The one assumption to check: `ScenePlanRow[]` (an intersection of mapped types) is assignable to `Json` without the cast; if not, `typecheck` fails at `lib/studio/api.ts` `p_scenes`.

**Open:** the parser's printed scene numbers (`12A`, locked numbering) never reach `scenes.scene_number` — BACKLOG 4.9 (manual scene numbers) needs a text column for them.
