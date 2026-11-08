# Session — 2026-10-27: conflict-free co-writing (ADR 0008), taken over and verified

Copilot's draft (#338: Yjs `Y.Text` synced over the `script_<id>` Realtime channel; `scripts.content` stays canonical, `scripts.yjs_state` holds the CRDT state; local-author undo; the old conflict prompt and `merge.ts` removed) was out of reviewer quota, so it was reviewed and tested here.

**Found by a real two-browser test and fixed** (neither was caught by unit tests):
- A collaborator's edit replaced the textarea value and the browser moved the writer's caret to the end, so typing landed in the wrong paragraph. The caret is now mapped through the incoming change (`mapThroughDelta`, unit-tested) and restored.
- A remote edit was rendered a tick after it entered the shared text; a key pressed in that gap was diffed against the stale textarea and erased the collaborator's words. Remote edits are now flushed to the screen synchronously (`flushSync`).
- The copy editor's change handler now goes through the sync layer's tracked change (undo included).

**Verified:** `e2e/editor-cowriting.spec.ts` (new: simultaneous typing in two places, at the very same spot, one deleting a paragraph while the other types in it — each ends with both windows equal and the stored `content` equal to the text decoded from `yjs_state`) and `e2e/editor-safety-net.spec.ts`, 6/6 against the local stack; unit tests 1727; typecheck and lint clean.

**Known gaps (BACKLOG 3.33):** the offline queue (`syncPendingScripts` in `lib/scriptos/storage.ts`) still upserts `content` alone, so `content` and `yjs_state` can disagree until the next edit; a very large script may exceed the Realtime message size; the channel is not private (as before, any signed-in client that knows a script id can broadcast to it).

**Budget:** `/editor` first-load JS rose from about 441 to 459.8 kB gzipped (Yjs and the sync layer), so its entry in `performance-budget.json` went to 482 kB on purpose. Splitting Yjs out of the first load (a dynamic import inside the sync hook's async setup) is possible if the editor's weight matters later.
