# Session — 2026-10-12: fields that say what they know (BACKLOG 3.20.1)

- `Character.firstLineIndex` now holds the line of the character's first cue (it was always 0); -1 when the reader never read one. The pinned expected-failure became a passing test (and its expected line was off by one — LEO is line 5).
- `Scene.omitted` removed from the type and the parser: nothing read it, and it was always false.
- `Character.lines` documented as the number of speeches.
- BACKLOG 3.20 item 1 closed; item 2 (real PDFs) still needs the owner's scripts.

**Verified:** 921 unit tests, typecheck, eslint. No UI change, no database change.
