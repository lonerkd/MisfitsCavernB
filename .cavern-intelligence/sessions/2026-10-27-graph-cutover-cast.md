# Session — 2026-10-27: graph cutover step 1 — cast comes from the links

**Done:** `StudioContext` exposes `castOf(scene)` — a scene's linked characters
in the film graph (`scene_characters`), else the older cast text only for a
scene with no links yet (`lib/film/cast.ts`). The stripboard (conflicts, day
cast, day out of days), readiness ("uncast"), the call sheet's cast, On set,
the Scenes tab and the breakdown sheets use it instead of splitting
`scenes.cast_list`. `buildBoard` and `sceneReadiness` take the cast function
as an optional argument (default: the text), so the pure code stays testable.

**Tests:** stripboard and readiness unit tests for graph-first cast.
No migration. No behaviour change for a scene whose links match its text; a
renamed or re-linked character now shows everywhere at once.

**Not done (audit steps 2–5):** the public `/call/[id]` page and the call-sheet
scene query still read the text; calls and castings by character id; locations
and shoot days by id; dropping the columns and the writer in `scene-sync.ts`.
