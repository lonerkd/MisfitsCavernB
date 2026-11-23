# 2026-11-23 — the docs made current, and a check for content that ages (RULES 8, 10)

**Why**: the owner asked for every file to be accurate and for the sync workflows to match how the work has actually been done. The existing guards all passed while `STATE.md` was two weeks behind: `check-state-freshness.mjs` compares the handoff's DATE with the newest session note, so a bumped date hid old content (the handoff stopped at PR #716 and migration `...000300`; main was at #744 and `...000700`).

**Changed**
- `STATE.md` "Resume here" brought to 2026-11-23: PRs through #744, the Notes format and the competitor-parity slices, migrations through `20261122000700`. **Verified against the Supabase migration lists of both projects (production and staging): every file through `schedule_versions` and `call_sheet_safety` is applied.** The wishlist-left list drops what is built (budget approved, cut locked, Excel budget export, world building, casting candidates) and names the parity plan's open gaps.
- `tools-and-access.md`: the three workflows it never named (`pr-title`, `release`, `sbom`) are described; the phone audit is 29 routes / 58 views, not 18 (also fixed in `mobile-audit.yml`'s comment).
- **New guard `scripts/check-state-facts.mjs`** (tests alongside; `npm run check-facts`): fails when a workflow is not described in `tools-and-access.md`; warns (never fails, since a migration is applied by hand after merge) when STATE's "production and staging match main through X" is older than the newest migration file, or the documented audit route count differs from the baseline. Runs in CI `checks` and in the SessionStart hook, so the next session is told the moment a fact drifts.

**Not done**: BACKLOG's "Last audited: 2026-10-06" is still true, not redated: checking every item against the code is its own pass (the per-item "Built" lines were kept current by each PR).

**Rule change (owner, 2026-11-23)**: RULES 11 no longer requires a reviewer other than the author. A Claude agent may review its own high-risk PR; the old wording was written for the weak local model. `STATE.md`'s standing permissions say the same. Self-review of this PR: the diff is one new script with tests, a CI step, a comment fix, an npm script and docs; the checker only reads files and exits non-zero on an undocumented workflow.
