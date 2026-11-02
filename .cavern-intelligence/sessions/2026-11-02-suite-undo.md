# Session — 2026-11-02: Ctrl Z outside the editor

`lib/os/undo.ts` is a short per-tool stack of real inverses, and Ctrl/⌘ Z outside a text box runs the newest one for the tool you are in (`components/shell/UndoKeys.tsx`, mounted in the shell and in split panes), with a toast that says what was undone or why it could not be. Registered in the Studio's schedule: moving a scene to another day, changing its status, and auto-schedule. Nothing is registered for what cannot be taken back, so Undo never claims more than it can do; with nothing to undo the key is left to the browser.

**Chord change:** Undo/Redo moved from the editor's own chords to global ones (`undo`, `redo`, `redo-y`): in a text box the box's own history answers (the editor's handler is unchanged in behaviour), elsewhere the suite's stack does. The shortcuts panel now lists Undo in its Global group.

**Verified:** unit tests for the stack (order, per-tool scope, async, failure, size, subscribers) and the chord table; `e2e/studio-undo.spec.ts` in a real browser (Alt+→ moves a scene to day 2, Ctrl Z puts it back on day 1 and says so; a status change and its undo; nothing left to undo shows no toast); the editor undo and chord specs still pass; typecheck, lint, full unit suite, bundle budget. No migration.

**Left (BACKLOG 4.1):** redo outside text boxes, more registered actions (rename a location, budget edits, tasks), the island showing the pending undo (the O slot), an undo that survives a reload.
