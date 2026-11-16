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
The removal is audit-logged since 2026-11-16 (see "Editing and reordering").

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

## Editing and reordering (2026-11-16)

Each question row has Up / Down buttons, an Edit panel and Remove.

- **Edit** (a plain `UPDATE` under the existing admin-only policy): the question's words and hint; `ask_when` as three inputs (only for formats, never for formats, and `question_key: option, option` lines for an earlier answer); and per option, `implies` (roles, breakdown categories, Lounge channels, pages per day) and `detect` (words, a character younger than N, night exteriors). Every input is parsed and checked in `lib/brief/rules.ts` (roles, channels and formats against their catalogues when those loaded; an earlier question and its option ids must exist; a question cannot depend on itself; numbers in range), so a bad value is a toast, not a bad row.
- **Reorder:** `admin_move_brief_question(key, direction)` renumbers the phase 10, 20, 30... in its current order (position, then key) and swaps with the neighbour, so equal or gappy positions cannot make a move do nothing; atomic; an end does nothing.
- **Remove:** `admin_remove_brief_question(key)` deletes the question (its answers cascade) and writes an `audit_logs` row (`admin_remove_brief_question`, resource the key, details: label, phase, answers deleted). Migration `20261116000400`; both functions admin-only and on the definer allowlist (`database-and-security.md` 2.D); persona test in `tests/integration/brief-questions-admin.test.ts`.

## Not built

Editing an option's label, adding or removing options of an existing question (an option's id is what answers point at, so renaming needs a migration of the answers), changing a question's phase or kind.
