# Session — 2026-11-03: the island counts which deck keys are used

First follow-up after the compact dock: `lib/island/keyUse.ts` counts each Caps Lock deck key press per control (`key:id`) in this device's localStorage only, nothing sent. Read it with `JSON.parse(localStorage.getItem('mc_island_key_use'))` to tune the ten slots. **Verified:** unit tests, typecheck, lint. **Left (BACKLOG 4.1):** Share, Note and Live actions; O is undo in the deck (`P` stays the project switcher; no redo exists yet); more registered undo actions; the tool-by-tool pass.
