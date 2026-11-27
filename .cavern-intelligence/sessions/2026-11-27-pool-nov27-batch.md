# Sweep STATE sync — #816 pools #806–#813, #816 checks red (bible drift)

2026-11-27 ~09:05 CST, hourly sweep. Docs-only sync (STATE.md handoff + this note).

## What changed on the board during this run

- **PR #816 opened** (feat(batch): Nov 27 pool — hub, island, split, game, readiness, tool headers, view-as; branch `claude/pool-nov27-batch`, head `f300bdd`, base `cf48222`, risk/medium). It pools #806–#813 plus the owner's two Nov 27 rulings: TOOL HEADER FIRST (every Studio tool page leads with its header card; Library, Mood boards and Production were the offenders; Pitch excepted) and VIEW-AS IS ON-DEMAND (sticky yellow banner off every screen; switch + preview state together on the project page, gated on the real owner; view-as-role e2e exit now via the project page).
- **#806, #807, #808, #810, #811, #812, #813 closed as superseded** (unmerged) ~08:59 CST. Open queue is now TWO: #816 + #784 (PAUSED).
- **#816 `checks` is RED** on head `f300bdd` (CI run 46020833861, job 140579826422): the `git diff --exit-code` step on `.cavern-intelligence/bible/inventory.md` failed after `npm run bible` regenerated it (64 routes, 114 tables, 84 functions, 163 specs). Page line counts moved (`/call/[id]` 337→335, `/lounge` 131→129, `/projects/[id]` 313→317, `/studio` 270→269) and the capabilities-family tables no longer list `/call/[id]` or `/lounge`. Fix: `npm run bible` + commit the regenerated inventory. The sweep posted the diagnosis on #816 (comment 7221700714) and did not push to the pooling session's branch. Database passed on #816's head; mobile-audit (run 46020833800) was still running. Typecheck/lint/test run after the bible step, so more may surface once it is green.
- **#815 merged** (squash `cf48222`); HEAD is `cf48222`. Main CI on `cf48222` GREEN (checks/database/sbom/history/changes success; Supabase Preview failure = standing); secret scan success.
- **Nightly e2e:** no new run — the fourteenth (run 46004453288, 21 tests) is still the latest; #731 open, 26 comments (the sweep's diagnosis comment 7220303509 is the newest). Next run is the fifteenth test. Note: #816 moves the view-as-role e2e exit to the project page, so the 14th run's view-as-role failures are partly stale expectations now.
- **Vercel cap resets ~22:52 CST Nov 27**; one redeploy of main after the reset lands everything queued since #800.
- BACKLOG.md, backlog-detail.md, `.perch/mcp.json`, migrations (newest still `20261126000100`, 161 files) all unchanged. No new Gmail failure mail since the 07:27:36 CST e2e failure mail; newest mail 08:10:54 CST (#815 risk + Vercel comments).

## Method note

Local verification did not run this run: worktree git/npm commands tripped an execution-risk check (same as the 07:54 AM sweep's `npm ci` block), so this PR relies on its own CI checks for verification (sync-intel, state-facts, bible drift all run in the `checks` job). The commit was built through the Git data API, not the worktree. The sweep worktree at `~/workspace/misfits-cavern-sweep` is still dirty from the #815 run (modified STATE.md + the untracked 14th-failure session note, both already on main) and still needs a reset by a session that can run git there.
