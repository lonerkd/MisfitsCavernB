# Session - 2026-11-18: a task opens its card; the call sheet warns of look changes (BACKLOG 3.18)

- **Task entry point:** each task in the project hub gets a **Card** link to `/studio?project=<id>&card=<task id>` (the address a mention's chip already uses), behind the `entity_cards` flag. `e2e/task-card.spec.ts`.
- **Look-change warning (continuity b):** a look that changes inside one story day is now on the call sheet of the shoot day that shoots either scene, on screen (a "Look changes" block) and in the printed sheet (a note, `planNotes`). Pure helper `lookChangesOnDay` with a unit test; `e2e/continuity.spec.ts` gains the call-sheet case.

**Verified:** typecheck (app and e2e), unit tests (`lib/film/continuity.test.ts`, the call-sheet print test), and `e2e/task-card.spec.ts`, `e2e/continuity.spec.ts`, `e2e/call-sheets.spec.ts` against a production build on the local Supabase stack. Not verified: the printed sheet was not looked at (the note rides the existing `planNotes` path); not on a phone.

**Left in 3.18** (in `backlog-detail.md`): look photo and wardrobe/prop elements, the wardrobe sheet PDF, shoot order beside story order; mentions in documents, notes and the Lounge (an owner decision); the editor on the graph (XL); money and my day.
