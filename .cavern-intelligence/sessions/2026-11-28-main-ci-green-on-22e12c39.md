# 2026-11-28 — main CI green on 22e12c39; fifteenth e2e failed; #844 fix merged

## What

Hourly sweep, ~06:54 CST. HEAD was `22e12c39` (#843 merged 05:57 CST).

- **Main CI GREEN on `22e12c39`** (CI run 46142309732, push, 05:57 CST:
  checks/database/sbom/history/changes success; Supabase Preview failure =
  standing; secret scan run 46142309659 + SBOM run 46142309663 success) —
  resolves the not-yet-visible item the 05:54 run left open.
- **Nightly e2e: the fifteenth run FAILED** (run 46144406947, schedule,
  06:23 CST, on `22e12c39`: all five shards failed, 26 tests — 4 + 7 + 5 +
  4 + 6, up from 21 in the fourteenth). Diagnosis on #731 (comment
  7239655996); full spec list in `2026-11-28-nightly-e2e-15th-failure.md`.
- **#844 MERGED by this sweep** (fix(a11y): underline the Write a post
  link; squash `ef3ff0b1`, 07:14 CST; risk/medium; CI run 46147648669 +
  mobile-audit run 46147648612 green; the gate first failed on a
  `not-run-claims` wording in the PR body — the body said the nightly
  "does not run on PRs" — reworded and the gate re-ran green, run
  46148268393). The fix's e2e effect is confirmed only by the next
  scheduled nightly run; follow-up tracked on #731.
- **#831's base is now 12 commits behind main** (compare API, against
  `ef3ff0b1`); **#837's base `fa874939` 7 behind; #835's base `a552c107` 8
  behind** — all three still green on CI + audit, re-verified this run;
  risk/high still gates #837/#835 (no API review recorded on either PR).
  Merge is each session's call; #831 needs main merged in first.
- Open queue still FOUR: #837 + #835 + #831 + #784 (PAUSED). Drift green
  (dispatch run 46078889053); migration line through `20261127000200`
  still holds (163 files). BACKLOG.md, backlog-detail.md and
  `.perch/mcp.json` unchanged.
- **Gmail triage did NOT run this run** — the Gmail connector returned
  rate-limited (`connector_rate_limited`, terminal for the attempt), so no
  new mail was checked; newest mail on record is still 05:28:57 CST; no
  new GitGuardian mail since Nov 25.
- Observation only: four more issue_comment-triggered Claude review runs
  on main (~07:03–07:04 CST, 46147653377 success, 46147649234 cancelled,
  46147684165 skipped, 46147768339 success) completed with no review
  recorded on any open PR — the same pattern, no action.

## Verification

Prose-only change (STATE.md handoff + session notes) — no RULES, route,
table or function text changed, so `sync-intel` and `bible` are no-ops by
construction; the change was built through the Git data API (no local
git/npm — worktree git/npm tripped an execution-risk check on the last
twenty runs). The PR's own CI is the verification. Not verified locally:
typecheck/lint/test/build (no code changed; nothing to typecheck). Not
verified: anything on a real phone, and the production deploy.
