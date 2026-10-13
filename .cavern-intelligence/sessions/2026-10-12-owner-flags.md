# Session — 2026-10-12: what needs the owner, on Today

Today's "Your projects" card now says, for each project you run, what needs you: **unanswered crew invites**, **overdue tasks**, and the **next shoot day** — flagged when its call sheet has not been issued and the day is within a week. Projects needing you sort first. Crew see none of it.

`lib/today/owner.ts` (pure, 4 unit tests), `getOwnerData` in `lib/supabase/today.ts` (three reads; if it fails the cards simply show no flags), the flags on the Today page. Spec `today-owner`: the owner sees the three flags, a crew member sees none.

**Verified:** typecheck, eslint, unit tests; `today-owner` on a real build. My spec's first run failed on its own setup (a column that does not exist) — fixed in the spec, not the app. **Not verified:** CI (billing).

**Left (BACKLOG 3.23):** call-sheet acknowledgements (no record exists yet), budget overruns, admin stats beside it.
