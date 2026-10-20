# Session — 2026-10-18: stack-trace exposure in the error log, documented

**Found (study of `/admin/errors`):** `client_errors` stores each stack as sent (up to 8,000 characters), and the admin page shows it. Stacks can carry internal paths, and anyone can write to the table through `report_client_error`, so an admin session that is compromised reads whatever was stored.

**Changed:** `bible/09-admin.md` › Known gaps now records the risk, links it to the `client_errors` design (`database-and-security.md` §2, `lib/errors/report.ts`) and recommends redacting before storing. `BACKLOG.md` 3.14 gains the work item.

**Verified:** docs only; no code changed. Not run: typecheck, lint, test, build.
