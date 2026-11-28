# Sweep STATE sync — main CI database flake again on 3476f6ec (third occurrence)

2026-11-28 ~05:25 CST, hourly sweep. Docs-only sync (STATE.md handoff + this note).

## What changed on the board during this run

- **NEW RED on main: CI `database` job failed on HEAD `3476f6ec`.** CI run 46139639040 (push, 05:23 CST), job 140962515099 (05:23–05:24 CST): `supabase db start` failed to bind host port 54322 — "address already in use" — the exact signature of run 45948105421 on `859eb7a8` (Nov 27 ~00:15 CST) and run 46030238576 on `815dbd82` (Nov 27 ~10:03 CST). Third occurrence of the same flake. `checks` still in progress at run end; secret scan run 46139639068 + SBOM run 46139639083 success; Supabase Preview failure = standing. New observation in the same job log: repeated "Error response from daemon: error from registry: Data limit exceeded" during image pulls (11:23:49–11:24:03Z) — possibly a contributing factor, not the terminal cause.
- **The sweep could NOT re-run the failed job this run.** The sweep's fine-grained token carries Contents + Pull requests only, no Actions write (re-run attempts 404'd on Nov 27). The re-run needs the GitHub UI. Main CI is red on HEAD until it lands. Per the sweep's fix rules, an external-infra failure is recorded and surfaced once, never chased with retries.
- **#841 merged** (squash `3476f6ec`, 05:23 CST); HEAD is now `3476f6ec`. Main CI green on the previous HEAD `c53e248b` confirmed by the last run (run 46119188333).
- **#831's base is now 9 merges behind main**; its head `3f5fdd6c` is still green on all checks, re-verified this run. **#837's base `fa874939` is now 4 behind; #835's base `a552c107` is now 5 behind** — both still green on CI + audit, re-verified this run; risk/high, RULES 11 review still gates each merge.
- **Nightly e2e:** no new run — the fourteenth (run 46004453288, 21 tests) is still the latest; #731 open, 26 comments, unchanged.
- **Drift green** (dispatch run 46078889053); migration line through `20261127000200` still holds (163 files).
- BACKLOG.md, backlog-detail.md, `.perch/mcp.json` all unchanged. No new GitGuardian mail since Nov 25; newest GitHub mail is the 05:22 CST #841 risk + Vercel comments. No failure mail for the database job yet — the CI run is still in progress, so it has not landed.
- One more issue_comment-triggered Claude review run on main at ~05:23 CST (46139673132 success) completed with no review recorded on any open PR — observation only, same pattern.

## Method note

Local verification did not run this run: the change is prose-only (STATE.md + this note — no RULES, route, table or function text changed, so sync-intel and bible are no-ops by construction), and worktree git/npm tripped an execution-risk check on the last eighteen runs, so this PR relies on its own CI checks for verification (sync-intel, state-facts, bible drift all run in the `checks` job). The commit was built through the Git data API, not the worktree. The sweep worktree at `~/workspace/misfits-cavern-sweep` is still dirty from the #815 run (modified STATE.md + the untracked 14th-failure session note, both already on main) and still needs a reset by a session that can run git there.
