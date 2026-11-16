# 2026-11-15 — the reporter hears how their report ended (BACKLOG 3.14)

**What:** when an admin settles a report in `/admin/reports` (open to resolved or dismissed), the person who filed it gets an in-app
notification ("Your report was resolved / dismissed", naming only a message, job or profile). It never carries the reported
person's name, id or any content. Done in the database, in a definer trigger `internal.reports_notify_outcome()` on
`reports` (`AFTER UPDATE OF status`), so the client (`settleReport`) is unchanged and every path that settles a report tells
the reporter. Only the move out of `open` notifies; re-settling does not. The trigger function is in `internal`, with no grants
(listed in `database-and-security.md` §2.D beside the other definer triggers; no new `public` RPC, so no allowlist row).

**Migration:** `20261115000700_report_outcome_notify.sql`. **After merge it must be applied to production, then staging**, then
the drift check.

**Verified:** persona test `tests/integration/report-outcome-notify.test.ts` (written, not run here). No Docker in this session, so
the integration test and `db:drift` did not run locally; CI's `database` job runs them. `schema.fingerprint` was updated by hand
(three lines: the function body hash, its grant, the trigger), the body hash computed with the same method that reproduces the
existing `internal.notes_notify()` hash. If CI's drift step disagrees, regenerate with `npm run db:drift -- --update`.

**Not done:** no link in the notification (a message has no page); reporting from more places stays on BACKLOG 3.14.
