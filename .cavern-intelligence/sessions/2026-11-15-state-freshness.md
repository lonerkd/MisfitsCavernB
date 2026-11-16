# Session — 2026-11-15: the STATE.md handoff must be fresh (BACKLOG 3.40c)

**Changed:** `scripts/check-state-freshness.mjs` (new) reads the date in STATE.md's `## Resume here (handoff, YYYY-MM-DD` heading and the newest `YYYY-MM-DD-` prefix in `.cavern-intelligence/sessions/`, and exits 1 when the handoff lags by more than 3 days. The parsing is in exported pure functions. `scripts/check-state-freshness.test.mjs` (new, 17 cases). `vitest.config.ts` include gains `scripts/**/*.test.mjs`, which was not picked up before. `.github/workflows/ci.yml`: one step in the existing `checks` job, no new workflow or job. BACKLOG 3.40(c) marked done; `tools-and-access.md` §7 lists the guard.

**Verified:** the script on the current tree passes (handoff 2026-11-15, newest note 2026-11-15), so STATE.md's date was left alone. The 17 tests pass under vitest.

**Overlap, not changed:** `scripts/check-bookkeeping.mjs` already reports a handoff older than the newest note, but as advice at a 14-day threshold and not in CI. It was left as is; the two could be merged later.

**Not verified:** the CI step itself has not run on GitHub yet; the full `typecheck`, `lint`, `test`, `sync-intel` and `bible` runs are in the PR.
