# 2026-11-26 — Sweep STATE sync (23:54 run): #805/#809 merged, mobile-audit red on thirty-three heads, #811 clears the portrait set, Vercel limit still hit, main-CI database flake fixed by re-run

**What changed:** `STATE.md` only (handoff + Known issues). Two merges since
the 22:54 sweep, both from the mobile-fix batch session: #805 (ui: every
switch is the disc — the pill and the hand-copies retire, 23:42 CST, merge
`93292590`) and #809 (mobile: Capture leaves by sliding home — on every
close, 23:49 CST, merge `859eb7a8` — the Capture exit animation from the
owner's ~23:31 CST burst, one requestClose path, 240ms slide-down). Four
new PRs opened since the last sync: #810 (cavern: a clean screen — no
narration, no Listen button), #811 (hub: one page, honest numbers — the
schedule, brief, guide and office fixes from the owner's hub burst),
#812 (hub: the project page leaves room for the island) and #813 (studio:
readiness in one line per blocker — and casting speaks once, Production
overhaul P0.5). #806, #807 (rebased, head `d8580bc`) and #808 (rebased,
head `91c2f39`) still open; #784 stays PAUSED unmerged pending the owner's
word.

**Main CI database flake, fixed by re-run:** the `database` job failed on
`859eb7a8` (CI run 45948105421, mail 23:55:30 CST) — `supabase db start`
hit port 54322 already in use on the runner, an infra flake, not code.
This sweep re-ran the failed job (attempt 2, job 140340107492); it
completed success, so main CI is green again on `859eb7a8` (checks,
database, sbom, history, changes success; Supabase Preview failure is the
standing non-required condition). CI on `cdc01d7` (#803 merge) confirmed
GREEN this run, closing the in-progress item from the 22:54 sweep.

**Mobile-audit is red on thirty-three PR heads since #788** — nine more
since the twenty-four in the last sync: #805 run 45946329682 (merged head
`85d673c`), #809 runs 45946271801 (earlier head `cc32be9`) and 45947450232
(head `4d23017`), #810 run 45946225758 (head `d14efab`), #807 run
45945867804 (rebased head `d8580bc`), #808 run 45945880002 (rebased head
`91c2f39`), #811 run 45947788730 (head `c79de66`), #812 run 45947712453
(head `5c73ae3`), #813 run 45948083333 (head `55a63a9`) — read from the run
logs. **#811's head clears the portrait set: /hub, /today and /auth are
all underBar 0 on `c79de66`** — the first head since #788 to clear the
portrait underBar counts; the hub-logic fixes moved them, and #812's head
(without #811) still flags all three at 2, so the clearing is #811's, not
the island-room change. Landscape on #811's head still flags /, /hub,
/today, /auth underBar 2 plus /settings small 3, and #813's head (also
without #811) still shows the full portrait set at 2. The streak's one
green break is still #802's audit on its merged head `3968294` (run
45942483739). #803's /settings small 3 (allowed 1) is on main now and the
audit will flag it on every head until it is fixed or the baseline moves.
It is not a required check, so #805/#809 merged with it red and the red
rides on main's HEAD. The mobile-fix session owns the fix — the sweep does
not touch the baseline and does not open a competing fix.

**Vercel's free-plan deploy limit still hit** (`api-deployments-free-per-day`,
over 100): new deployment-failed comments on #809/#811/#812/#813 (mails
23:43–23:49 CST), so preview deploys fail on #802–#813 until the limit
resets (~24h). The production deploys for #800/#802/#804/#803/#805/#809
are unverified and very likely also blocked — the owner's phone will not
see tonight's merges until a deploy lands. No code fix (RULES 9: fewer
deployments, not a bigger plan).

**Nightly e2e:** #731 still open, 20 comments (updated 07:28 CST); tonight's
run (~04:40 CST Nov 27) is the fourteenth test, the first on the fixed HEAD
now including #792–#804 plus #803, #805 and #809. Drift green (run
45931715972); newest migration on main is still `20261126000100`, so the
migration line stays correct — `check-state-facts` clean, no warning.
BACKLOG.md, backlog-detail.md and `.perch/mcp.json` unchanged on main
(blob SHAs `1cb6a9d8…`, `d26c08a5…`, `7a03977e…`). Gmail: newest mail
23:57:02 CST (mobile-audit failure on #813); no new GitGuardian mail since
Nov 25; no CI failure mail other than the main-database one above.

**Verified:** `node scripts/check-state-facts.mjs` clean, no warning;
`npm run sync-intel` no drift and `npm run bible` no drift (still 163
specs); typecheck pass; lint 0 errors (6 pre-existing warnings); test
474 files / 3800 passed / 26 skipped / 0 failed; build pass. Docs-only change — no code,
no migration, no behaviour change.
