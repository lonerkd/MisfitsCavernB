# Session — 2026-10-25: move full e2e suite from PR CI to nightly schedule

**Changed:** `.github/workflows/ci.yml` — removed the 5-shard `e2e-local`
matrix (was ~32 min on every PR push where app files changed). Added
`.github/workflows/e2e-scheduled.yml` — the same 5-shard job, running nightly
at 03:47 UTC and on `workflow_dispatch`. Added `.harnesskit/` to `.gitignore`
(session-local harness artefact). Updated `RULES.md`, `BACKLOG.md`,
`tools-and-access.md` and `bible/10-platform.md` to reflect the new CI shape.

**Verified:** `checks` and `database` CI green on PR #245 before merge. Vercel
preview failing across all branches (pre-existing: `scripts/preview-env-guard.js`
blocks builds when the Preview env has production keys; needs a staging project
in Vercel's Preview environment variables — owner action, `adr/0006-staging-environment.md`).

**Not changed:** no app code, no schema, no tests.
