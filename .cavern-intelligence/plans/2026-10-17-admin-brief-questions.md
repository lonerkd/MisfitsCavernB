# Admin catalogues — brief questions (design, 2026-10-17)

Crafts, channel presets and project formats already have `/admin/*` screens.
Brief questions were the last catalogue changed only by migration (BACKLOG 3.14).
This is the design for that screen and what was built from it.

## Security

No new table or policy. `brief_questions` already has `read` for everyone and
admin-only insert / update / delete (`internal.caller_is_admin()`,
`20260930010000_advisor_fixes.sql`). The page sits behind
`<ProtectedPage require="admin">`, which is convenience only — RLS is the
boundary. Persona spec: `tests/integration/brief-questions-admin.test.ts`
(anon read ✅, Sam / Jordan / Riley / anon write ❌, admin write ✅).

## Destructive path

`project_brief.question` is `ON DELETE CASCADE`: removing a question deletes
every project's answer. So the page counts them first (`countAnswers`) and the
confirm dialog says the number ("This deletes 7 project answers…"); if the
count fails it says so and still asks. No soft-delete in this slice.
Audit-log entry for the removal is **not** built (formats/crafts don't log
either); listed in BACKLOG.

## Wireframe — `/admin/brief-questions`

```
← Admin
Brief questions
What every project's brief asks, phase by phase. …

┌ Add a question ──────────────────────────────────────────────┐
│ [Question_______________] [Hint (optional)_____] [Phase ▾]   │
│ [Answer is ▾]  one choice / several / a number                │
│   choice:  [Options, one per line (textarea)]                 │
│   number:  [Lowest] [Highest] [Unit (optional)]               │
│ [+ Add question]                                              │
└───────────────────────────────────────────────────────────────┘

DEVELOPMENT
 ┌──────────────────────────────────────────────────────┐
 │ What is the goal?  · goal · 5 options            [🗑] │
 │ hint text                                             │
 └──────────────────────────────────────────────────────┘
PRE-PRODUCTION
 …
```

States: loading ("Loading…"), error (alert + Try again), empty (no phase
sections), busy (button "Adding…"). Mobile: the form wraps; rows stack.

## Component structure

| Piece | File |
|---|---|
| Page | `app/(suite)/admin/brief-questions/page.tsx` |
| Pure checker (words for every limit the DB enforces) | `lib/brief/check.ts` (+ `check.test.ts`) |
| Writes: add, count answers, remove | `lib/supabase/admin-brief.ts` |
| Cache reset so the catalogue re-reads | `resetQuestions()` in `lib/brief/index.ts` |
| Nav | `BRIEF` link on `/admin` |

Same shape as `/admin/formats`.

## Not in this slice

Editing an existing question; reordering; setting `implies`, `detect` and
`ask_when` (they drive the suite's analysis and stay migrations — a new
question implies nothing until then); an audit-log entry on removal.
