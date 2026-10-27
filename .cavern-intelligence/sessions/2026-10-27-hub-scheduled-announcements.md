# Session — 2026-10-27: scheduled hub announcements now fire after publish time

**Why:** backlog item 3.28a: important/scheduled hub posts never notified anyone once their `published_at` time passed.

**Built:** migration `20261027054225_hub_scheduled_announcements.sql` adds `internal.hub_posts_announce_scheduled()` (SECURITY DEFINER, no API grants) and a `pg_cron` job every 5 minutes (`hub-post-scheduled-announcements`) to announce loud posts (important or incident) whose publish time has passed and that still have no `/hub/<id>` notifications.

**Proof:** `tests/integration/hub.test.ts` adds a persona test that schedules an important post 1s ahead, waits past publish time, runs one cron pass, and verifies notifications go to Sam/Jordan/Riley once (a second pass adds none).

**Docs:** `database-and-security.md` §2.D now lists the scheduled announcer in the definer allowlist notes; `BACKLOG.md` item 3.28a removed as done.
