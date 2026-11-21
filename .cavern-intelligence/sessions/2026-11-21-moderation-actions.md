# Moderation, slice 2: an admin acts on a report (2026-11-21)

Branch `claude/moderation-actions` (local, not pushed). Gate: BACKLOG 3.14, "report, queue, hide, suspend" before the network opens to strangers.

## What was already there
Reports and `/admin/reports`, close a job, hide a message (original kept), the auth-service ban from `/admin/users`, the reporter notified. Missing: hiding a job or a page, any database-side refusal for a suspended account (a ban leaves an issued token working up to an hour), a reason, an outcome on the report.

## What changed
- Migration `20261121000600_moderation_actions.sql`: state as columns, not a table (smaller): `jobs.hidden_at/hidden_by/hidden_reason`, `profiles.hidden_at/suspended_reason`, `reports.outcome`. The one jobs SELECT policy hides a hidden job from everyone but its poster and admins (so search and Realtime obey it). `internal.moderation_write_guard` (triggers on `messages`, `jobs`, `job_applications`, `reports`) plus `internal.is_suspended()` refuse a suspended account with a plain sentence; `edit_message` checks it. `internal.jobs_moderation_guard` and a widened `internal.profiles_guard` keep the moderation columns admin-only and stop a person re-publishing a page that was taken down. New functions `admin_hide_content`, `admin_report_target`, `admin_moderate_report`; `admin_set_suspended` replaced only to clear the reason on reinstate. `internal.caller_is_admin()` granted to `anon` because the jobs policy runs for signed-out readers.
- `/admin/reports`: per report, the thing's and author's state, a reason field, Hide / Take the page down, Suspend the author, Close the job, Mark resolved, Dismiss (each confirmed, toasted), Bring it back / Reinstate on settled reports; settled reports show their outcome.
- Poster sees "removed by moderators" (with the reason) on the job page and in My Jobs. `lib/moderation/moderation.ts` (pure wording, tested). Audit sentences added.
- Docs: `database-and-security.md` (section 2.D rows, jobs and reports), `backlog-detail.md` 3.14.

## Verified
`npx tsc --noEmit` clean; eslint clean on the changed files except pre-existing literal-colour errors in `app/(suite)/jobs/[id]/page.tsx`; `npx vitest run lib/moderation lib/audit app/(suite)/jobs app/(suite)/admin components/jobs` passes.

## Not verified (no Docker here)
The migration was never applied; `tests/integration/moderation-actions.test.ts` was never run; `database.types.ts` not regenerated (the new RPCs go through an untyped wrapper in `lib/supabase/reports.ts` and the test); the admin screen was not looked at in a browser; `e2e/reports.spec.ts` not re-run (its Close the job flow is kept).

## Owner to do
Run `npm run db:reset`, `npm run db:types`, the persona test and `e2e/reports.spec.ts`; apply to production then staging; drift check.

**Independent review (a fresh Sonnet reviewer):** no blockers. Fixed: an admin's page cannot be hidden (`admin_hide_content` now refuses it, as `admin_set_suspended` refuses an admin); the `Jobs readable` policy evaluates `(select internal.caller_is_admin())` once per query; the new `jobs.hidden_by` foreign key has its index (the index-hygiene test caught it). **The claim, narrowed on purpose:** a suspended account is refused at the database for the four write paths guarded (messages, jobs, applications, reports, and message edits), not for every write; projects, media, comments and profile edits are not guarded, and the auth ban also stops a refreshed session within the hour. Extending `is_suspended()` to the common write policies is the follow-up (S/M). `get_platform_stats` still counts hidden jobs (a count, no content).
