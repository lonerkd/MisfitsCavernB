# Session — 2026-10-18: tests for the film-graph backfill's ambiguity handling

**Added:** `tests/integration/film-graph-backfill.test.ts`. It reads the backfill blocks verbatim out of the two migrations (days/places, people in scenes), runs them over legacy-shaped rows (text only, scene triggers off) in a transaction that is rolled back, and checks: same-normalised spellings join; near-identical names (`COFFEE SHOP` / `COFFEE  SHOP` / `COFFEE-SHOP`, `DR. SMITH` / `DR SMITH`, `JOHN` / `JON`) stay separate rows and separate links; blank/over-long locations are left unlinked; `cast_list` text is untouched.

**Found:** the spec promises ambiguous matches are *listed for a person to settle*. No listing exists — the backfill only avoids merging. Two `it.todo`s mark it; scoped in BACKLOG 3.18a. Building it is a schema decision (new migration), not done here.

**Not verified:** nothing was run. Docker is not running on this machine and installing dependencies/starting it was denied, so no typecheck, lint or integration run happened. Run `npm ci`, `npm run db:start`, `npx vitest run -c vitest.integration.config.ts tests/integration/film-graph-backfill.test.ts`. One assumption to check first: the test inserts into `scenes` as the database owner with `location`/`cast_list`/`scene_number`/`title` only.
