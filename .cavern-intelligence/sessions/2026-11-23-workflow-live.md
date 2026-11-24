# Session - 2026-11-23: Your workflow's ticks stay current (BACKLOG 3.52)

The per-role readiness ticks read their record counts once when the Production tab opened, so a record added in another tab or by a teammate showed no tick until a reload. `YourWorkflow` now re-reads the counts when the window regains focus and when anything announces a project change (`PROGRESS_EVENT`, the event the project's own progress already listens to). No migration.

**Verified:** typecheck, lint, `YourWorkflow` tests (a new case: a record appears after the event and the tick follows, "Prep: 1 of 2" to "2 of 2"). Not looked at in a browser.
