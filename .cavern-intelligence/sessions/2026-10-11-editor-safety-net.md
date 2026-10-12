# Session — 2026-10-11: the editor's safety net (E0)

First rung of the [editor-on-the-graph plan](../plans/2026-10-11-editor-integration.md)
(PR #169; may not be merged yet): tests that pin down what co-writing, offline and
a character rename do **today**, added before anything changes how the editor stores
or syncs a script. No product change.

**Added** (`e2e/editor-safety-net.spec.ts`, `tests/integration/film-graph-rename.test.ts`):
- Two writers, one after the other: both edits survive, in both windows and on the server. **Passes.**
- Offline: typing is kept on the device (IndexedDB, `syncPending`) and reaches the server when the connection returns, with no action from the writer. **Passes** — this was an open question.
- **KNOWN GAP (confirmed, marked `test.fail`)** — two writers at once, in different scenes: one writer's edit is lost. Reproduced with a diagnostic run: A's text survives in both windows and the database; B's `B wrote this.` is gone from all three, and nothing warned B. Cause: A's whole-document broadcast replaces B's unsaved typing when B's last keystroke is over 1 s old (the conflict prompt only fires on large differences). The CRDT (E3) fixes it; the marker flips the test to failing when it does — delete the marker then.
- **KNOWN GAP (marked `it.fails`)** — a character renamed in the graph is reverted by the next script sync (the sync rewrites `cast_list` from the script text, which still says the old name, and recreates the old character). No UI can rename a character yet. E4 makes a rename rewrite the script text first.

**Unconfirmed:** in one early run, A's typing was split between the heading and the end of the script after a remote version arrived — possibly the editor moving the caret when it applies a remote version, possibly the `(` auto-close interacting with it. The final spec types plain letters and doesn't show it. Worth a look in E3.

**Not done from E0:** the editor render-cost baseline.

**Verified:** the three e2e specs ran against a build of this branch (3 pass, one as an expected failure); the integration file (1 pass, 1 expected failure). **Not verified:** CI shards.
