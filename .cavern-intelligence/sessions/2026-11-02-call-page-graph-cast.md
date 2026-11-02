# Session — 2026-11-02: the crew's call sheet reads cast through the graph

`/call/[id]` (and `getCallSheetView` behind it) showed each scene's cast from the `cast_list` text and the viewer's characters from `character_castings.character_name`. It now reads the linked characters (`scene_characters` → `characters`, in name order, as the Studio does) and a casting's linked character name, with the text as the fallback for a scene with no links. `sceneCast` (`lib/studio/api.ts`) does it. Visible effect: none while the triggers keep the text in step; it is what lets the text columns go (cutover step 5).

**Verified:** a persona test against the real stack (`tests/integration/call-sheet-view.test.ts`: Jordan, cast as MAYA, reads the scene cast `BEN, MAYA` and his own `MAYA`; a character rename shows in both; Riley reads nothing) plus unit cases for `sceneCast`; the call-sheet browser spec passes; typecheck, lint. No migration.

**Left:** `character_name` on calls (the calls' reader keys on the name), `scene-sync.ts` (the writer), and the day-rate and other readers listed in the audit plan.
