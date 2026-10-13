# Session — 2026-10-13: Continuity and the Casting board read who is in a scene from the links

BACKLOG 3.18 (a), first slice. The triggers from step 2 already keep `scene_characters` in step with `scenes.cast_list` in production, so the rows are there to read.

**Changed:** `lib/film/cast.ts` (pure: `castByScene`, `castOfScene`, `castFromText`) with 4 tests; `studio.listSceneCharacters` and `useSceneCharacters` (live); Production › Continuity and the Casting board use them. A scene with no link rows falls back to its text, so nothing disappears while links catch up.

**Still on the text:** `CallSheetsPanel`, public `/call/[id]`, On set, Readiness, Scenes tab, `stripboard.castOf`, and `character_name` on calls (BACKLOG 3.18 (a) lists them).

**Verified:** `lib/film/cast.test.ts` 4/4, typecheck, lint (0 errors), `npm run build`. **Not verified:** the two screens against a real database (no local stack run), e2e, CI. One thing to watch: the two screens now show cast in character-name order, where the text kept script order.
