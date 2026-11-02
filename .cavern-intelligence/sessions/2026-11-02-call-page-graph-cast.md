# Session — 2026-11-02: the crew's call sheet reads cast through the graph

`/call/[id]` (and `getCallSheetView` behind it) showed each scene's cast from the `cast_list` text and the viewer's characters from `character_castings.character_name`. It now reads the linked characters (`scene_characters` → `characters`, in name order, as the Studio does) and a casting's linked character name, with the text as the fallback for a scene with no links. `sceneCast` (`lib/studio/api.ts`) does it. Visible effect: none while the triggers keep the text in step; it is what lets the text columns go (cutover step 5).

**Verified:** a persona test against the real stack (`tests/integration/call-sheet-view.test.ts`: Jordan, cast as MAYA, reads the scene cast `BEN, MAYA` and his own `MAYA`; a character rename shows in both; Riley reads nothing) plus unit cases for `sceneCast`; the call-sheet browser spec passes; typecheck, lint. No migration.

**Left:** `character_name` on calls (the calls' reader keys on the name), `scene-sync.ts` (the writer), and the day-rate and other readers listed in the audit plan.

**Found in review (high-risk tier, Claude session) and fixed:** a call is filed under the name as typed ("Dock Boy") while a casting is the character's upper-case name, so the cast member's own call was missed whenever they differed in case: `callFor` now matches on the name, not its case (tested); the page type no longer carries `cast_list` beside `cast` (one source of truth); the text fallback lists each name once; the rename test is self-contained. **Known limit, not fixed (pre-existing, in BACKLOG 3.18):** an issued sheet's snapshot files a call under the name it had when issued, so a character renamed after issuing no longer reaches the cast member's call on that page; the fix is the snapshot keyed by character id, with the text-column drop.

