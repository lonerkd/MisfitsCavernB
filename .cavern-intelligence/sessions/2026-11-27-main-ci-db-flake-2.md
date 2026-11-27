# Sweep STATE sync — main CI database flake again on 815dbd82, drift green

2026-11-27 ~10:54 CST, hourly sweep. Docs-only sync (STATE.md handoff + this note).

## What changed on the board during this run

- **NEW RED on main: CI `database` job failed on HEAD `815dbd82`.** CI run 46030238576 (push, 10:03 CST), job 140611953368 (10:03–10:04 CST, failure mail 10:07:40 CST): `supabase db start` failed to bind host port 54322 — "address already in use" — the exact signature of run 45948105421 on `859eb7a8` (Nov 27 ~00:15 CST, fixed then by a failed-job re-run). Infra flake, not code. `checks` passed on `815dbd82`; secret scan + SBOM success.
- **The sweep could NOT re-run the failed job this run.** Two attempts at `POST /actions/runs/46030238576/re-run-failed-jobs` (and one at `re-run`) all returned 404: the sweep's fine-grained token carries Contents + Pull requests only, no Actions write. The re-run needs the GitHub UI (or a token with Actions write). Main CI is red on HEAD until it lands. The 00:15 sweep's re-run used a path this token no longer reaches; the token scope is the blocker, not the run.
- **#818 merged** (squash `815dbd82`, 10:02 CST); HEAD is now `815dbd82`. Note: #818's own handoff text still said "HEAD is now `2ef1043`" — this sync corrects that.
- **Drift green on the new HEAD:** scheduled run 46036171080 (10:44 CST, on `815dbd82`) completed success. Migration line through `20261126000100` still holds.
- **#816 still merge-ready on CI** (head `b2f50a6`, all required checks green; only red is the known mobile-audit thirty-five-head fingerprint). Its base `cf48222` is now 2 merges behind main (`2ef1043`, `815dbd82`) — the branch needs a rebase before merging; the merge is the pooling session's call. The sweep did not merge it.
- **Nightly e2e:** no new run — the fourteenth (run 46004453288, 21 tests) is still the latest; #731 open, 26 comments, unchanged. Next run is the fifteenth test.
- **Vercel cap still in effect** (reset ~22:52 CST Nov 27). A Vercel bot comment on #818 (10:01:52 CST) shows a deployment "Building" — not treated as proof the cap lifted; the reset time is unchanged.
- BACKLOG.md, backlog-detail.md, `.perch/mcp.json`, migrations (newest still `20261126000100`, 161 files, ref `815dbd82` in the listing URLs) all unchanged. No new GitGuardian mail since Nov 25; newest GitHub mail is the 10:07:40 CST CI failure mail.

## Method note

Local verification did not run this run: the change is prose-only (STATE.md + this note — no RULES, route, table or function text changed, so sync-intel and bible are no-ops by construction), and worktree git/npm tripped an execution-risk check on the last two runs, so this PR relies on its own CI checks for verification (sync-intel, state-facts, bible drift all run in the `checks` job). The commit was built through the Git data API, not the worktree. The sweep worktree at `~/workspace/misfits-cavern-sweep` is still dirty from the #815 run (modified STATE.md + the untracked 14th-failure session note, both already on main) and still needs a reset by a session that can run git there.
