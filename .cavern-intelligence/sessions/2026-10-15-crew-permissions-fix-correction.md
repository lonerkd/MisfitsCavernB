# Session — 2026-10-15: the P0 crew-permissions fix, corrected

A QA pass (Peter, 2026-10-15) found a real P0: a lead could approve their
own timesheet hours, and applied a fix directly to production SQL (no PR).
The fix was broader than the bug: it narrowed `internal.can_shape_project`
from `role in ('lead', 'contributor')` to `role = 'lead'` only — which also
revoked every contributor's project-shaping rights (vendors, expenses, the
brief, call sheets, documents, crew availability, posting jobs), not just
the self-approval loophole. That contradicts an explicit design comment in
`20260928020000_project_brief.sql` ("Owner and contributors shape the
project; viewers (guests) only read") and broke `tests/integration/
money.test.ts`, confirmed by running the integration suite locally against
the production function bodies before touching anything.

**Committed `supabase/migrations/20261015040416_crew_permissions_fix.sql`,**
reconstructed from production's live function bodies, then corrected to
restore `can_shape_project`'s contributor clause and keep only the real fix:
`internal.timesheets_guard` now blocks anyone — owner excepted — from
deciding their own hours, whether they're a lead or not.

**Owner: production still has the over-broad version** (`role = 'lead'`
only, no self-row guard beyond what shaping already implied) — checked live
via the Supabase connector just now. Once this PR merges, paste
`20261015040416_crew_permissions_fix.sql` into the SQL editor to replace it,
then run *Production schema drift*. The 14 contributors who lost shaping
rights get them back the moment this applies — no further action needed for
them.

**Verified:** local `supabase db reset` + `npm run db:drift` (two function
hashes changed, matching exactly what this migration touches; `--update`
committed); a new persona test in `money.test.ts` (a lead approves someone
else's hours, is blocked from approving their own, only the owner can);
full integration suite (56 files, 377 passed + 1 expected-fail, unrelated);
unit tests (1007), typecheck, lint, build all clean.

**Not verified:** the 2026-10-15 production incident's own data (the QA
report's cleanup checklist — QA-Night Shift project, test crew member,
timesheet entries, channel messages) — that's the owner's QA session data,
not touched here.
