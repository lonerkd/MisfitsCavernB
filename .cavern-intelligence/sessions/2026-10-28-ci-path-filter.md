# Session — 2026-10-28: CI no longer runs the heavy jobs for workflows that cannot affect them

A one-file agent-workflow PR (#348) waited on the full `database` and `checks` runs because the change filter treated any edit under `.github/workflows/` as schema- and app-affecting, and anything that is not prose as code. Owner agreed to narrow it (2026-10-28).

**Changed** in `.github/workflows/ci.yml` (`changes` job): `agent-*.yml`, `release.yml`, `sbom.yml` and `secret-scan.yml` count as prose; the database job keys on `ci.yml` only (not every workflow); the browser journeys key on `ci.yml` and `e2e-scheduled.yml`. Everything else (migrations, `lib/`, `app/`, `package.json`, `ci.yml` itself) still runs the full set, and pushes to `main` still run the database tests.

**Verified:** the three patterns, taken from the file, against sample change sets — agent workflow plus a note, release, `ci.yml`, `e2e-scheduled.yml`, docs, app code, a migration — gave the intended code/db/app flags. This PR touches `ci.yml`, so it runs the full set itself.
