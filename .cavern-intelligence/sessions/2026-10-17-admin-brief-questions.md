# Session — 2026-10-17: admin screen for brief questions

`/admin/brief-questions`: add a question (words, hint, phase, choices or a
number range) and remove one. Removal counts the projects' answers first and
the confirm says the number, because `project_brief` cascades. Pure checker in
`lib/brief/check.ts` (tested), writes in `lib/supabase/admin-brief.ts`, a
`BRIEF` link on `/admin`. No schema change: RLS already admin-write; persona
spec `tests/integration/brief-questions-admin.test.ts`. Design and wireframe:
`plans/2026-10-17-admin-brief-questions.md`. Not done: edit/reorder,
`implies`/`detect`/`ask_when`, audit entry on removal (BACKLOG 3.14).
