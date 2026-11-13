# 2026-11-10 — Creative tools: story, characters, world, island uploads

Branch: `claude/creative-tools` (restored from `stash@{0}`).

## Built

- **Story structures + interview (3.25, 3.26):** `lib/story/structures.ts` (7 templates + coverage check), `lib/story/interview.ts` (7 questions, completion, skeleton builder), `StructurePicker`, `StoryInterview` (autosaves per project), Outline integration with a "beats covered" count, editor modal + "Interview" button that applies skeleton scene headings. Persistence: migration `20261110000000_story_interviews.sql` (RLS via `can_access_project`/`can_shape_project`), `lib/supabase/story.ts`, persona test `tests/integration/story-interviews.test.ts`.
- **Characters (4.8):** `lib/characters/depth.ts` (goals/fears/flaws/arc + consistency warnings), `CharacterDepthPanel` mounted in the editor's Character Bible, `ArcTimeline` (mounted), `RelationshipMap` (component built, not yet mounted).
- **World building (4.11):** `lib/world/world.ts`, `WorldEditor`, `WorldView` mounted as a "World" view in Studio › Production (`?view=world`), route `/projects/[id]/world`.
- **Editor power nav (4.7):** `lib/editor/navigation.ts` (`scenesForCharacter`, `sceneByNumber`); Go-to-Scene now accepts a character name and jumps to their first scene.
- **Version comparison (4.12):** `lib/scriptos/versiondiff.ts` (`lineDiff`, `changeStats`) — helpers only; the existing DiffModal still owns the UI.
- **Breakdown (4.10):** `lib/breakdown/suggest.ts` — found redundant with the existing `lib/breakdown/marks.ts` suggestion engine; kept as a helper.
- **Island uploads (4.1):** Previous-track control on the music activity; SFX library, paperwork scans and Capture outbox uploads report progress; upload **Cancel** control on the island; `uploadWithProgress` retries once on a dropped network and never on cancel.

## Dropped

- The earlier mood-board prototype (migration `20261104000000`, `lib/moodboards`, `components/moodboards`, `/projects/[id]/moodboards`) — superseded by the proper implementation on `claude/mood-boards` (Studio › Library › Mood boards, migration `20261105000000`). Removed to avoid a duplicate migration.

## Verified

- `npm run typecheck` clean, `npm run lint` 0 errors (1 pre-existing warning), `npm run test` 2161 passed / 2 skipped, `npm run build` succeeds.
- Integration test written but not run (needs the local Supabase stack).
- **2026-11-11:** resolved the merge conflicts from `origin/claude/film-search` (kept its `PRODUCTION_VIEWS` refactor, regrouped `VIEWS` and `moveCaretLine`; added `world`). Refined the new ESLint colour rule so token-based `rgba(var(--ink-rgb), …)` is allowed, added `--scrim-flat`/`--scrim-flat-strong` tokens, replaced the remaining literal colours with tokens/`color-mix`, and added the `story_interviews`, `casting_notes` and `worlds` tables to `lib/supabase/database.types.ts` so the `as any` casts could be removed. After that: **typecheck clean, lint 0 errors, test 2389 passed / 1 expected fail / 2 skipped** (the merged branch added tests).

## Left

- RelationshipMap needs a project-wide surface; world/character arcs and relationships are not persisted (world is); casting drag-and-drop; three-way merge; island per-page Share/Note/Live action registration (the island-at-every-size design pass).
- **2026-11-11 additions:** casting auditions (`casting_auditions`), casting decision history (`casting_history`), side-by-side candidate compare, casting sheet PDF; diff element filters (dialogue/action/scene) and review mode with accept/reject per change (`change_reviews`); world persistence (`worlds`); the `film-search` merge conflicts resolved and the lint colour debt cleared.
