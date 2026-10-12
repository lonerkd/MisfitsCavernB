# Session — 2026-10-11: the editor-on-the-graph plan

Owner: the editor is the core of the suite and cutting it over to the film
graph is a major expansion, not a thinning. Wrote
[plans/2026-10-11-editor-integration.md](../plans/2026-10-11-editor-integration.md):
what the editor is (measured: page 1,610 lines, components 4,187, engine 3,436,
six e2e specs), the three hard problems (text vs identity, whole-document
last-writer-wins, offline), the target feel, a seven-rung route (E0–E6), risks,
and four decisions for the owner (chiefly: a CRDT under the script).

**Found:** `sync_script_scenes` overwrites `scenes.cast_list` from the script
text on every save, and `characters_rename` (step 2) rewrites `cast_list` — so
a character renamed in the graph would be reverted by the next sync. Harmless
today (no rename UI); the plan makes a rename a text rewrite first.

**Not built.** BACKLOG 3.18(d) points at the plan. Next: the owner's answers to
§6, then E0 (the safety-net specs), a pure addition.
