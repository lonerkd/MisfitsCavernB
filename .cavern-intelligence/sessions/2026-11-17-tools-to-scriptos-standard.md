# Session - 2026-11-17: the record tools get the script editor's habits (owner: "bring each tool up to the ScriptOS standard")

The 25 record tools (Safety, Permits, Costumes, Camera reports, ...) all save through one hook, `useSettingsList`, so the two habits that most set the editor apart were added there once, for all of them:

- **Undo.** Every save (an add, an edit, a removal) pushes its inverse on the suite's undo stack (`lib/os/undo`, `lib/studio/record-undo.ts`): Ctrl/⌘ Z in the Studio (and the island's Undo) puts a removed record back, takes an added one away, restores an edited one. The delete confirmation now says so. A failed save pushes nothing.
- **Offline.** A save that fails because the connection is down is kept on this device (`lib/studio/record-queue.ts`, localStorage), shown at once, and sent when the connection returns (the `online` event, and when a tool opens); the newest change to a record wins; a database refusal is never queued (it is told, as before); a change refused on sending is reported. A refresh while offline lays the queued changes over what loads.

Unit-tested (record-undo 5, record-queue 4, hook 5 new). Not run in a browser; offline was not tried with a real network cut. **Left (the rest of the standard):** a visible "n changes waiting" chip and the island's sync state for the queue, presence in a tool (who else is in it), search inside a tool's list, keyboard shortcuts, loading a tool's list offline (only saving is offline today), and each tool's own depth (3.51's practitioner runs).
