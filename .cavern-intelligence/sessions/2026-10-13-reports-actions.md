# Session — 2026-10-13: acting on a report — close the job

From `/admin/reports`, an admin can **close the reported job** (confirmed): it leaves the board and stops taking applications, nothing is deleted, the report is resolved with it, and `audit_logs` records who did it. Done through `admin_close_job(job)` — a `SECURITY DEFINER` function gated by `internal.caller_is_admin()` (added to the allowlist in `database-and-security.md` §2.D), because a job belongs to its poster and RLS rightly gives an admin no write.

- Migration `20261013020000_admin_close_job.sql`; persona test `admin-close-job.test.ts` (5: member refused, anon refused, the poster is not the admin's tool, the admin closes it and it is logged, a missing job is an error) — the positive test failed before the migration. Full integration suite green. Snapshot and types regenerated.
- `reports` e2e extended: the admin closes the job from the queue; job status and the audit row checked.

**Owner action:** apply `20261013020000_admin_close_job.sql` to production after `20261013010000_reports.sql` (STATE lists the order); then the drift workflow.

**Verified:** typecheck, eslint, integration, `reports` e2e on a real build. **Not verified:** CI (billing); production.

**Left (3.14):** hiding a message, suspending an account, the formats and brief-questions admin screens.
