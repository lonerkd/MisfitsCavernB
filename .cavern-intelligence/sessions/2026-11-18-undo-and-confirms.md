# Session - 2026-11-18: undo for scene colour, note and unlinked references; for resolving a post note; confirms in Casting

Scenes tab: changing a scene's colour or note and unlinking a reference push an undo (re-colour, restore the note, re-link). Post: resolving or reopening a note can be undone. Casting: removing a casting note and cancelling an audition now ask first. All through `lib/os/undo` with the origin taken before the first await. The audit found these tools already checked errors, confirmed deletes and toasted; undo was the gap.

**Verified:** typecheck, lint, `components/studio` unit tests. The wiring is not unit-tested (the stack itself is, in `lib/os/undo.test.ts`) and not run in a browser. **Left:** Crew boards, Library and Share have nothing reversible to undo that was found; Jobs, Crew, Hub and Soundtrack are not audited (BACKLOG 3.38 / 3.51).
