# 2026-11-26 — Sweep STATE sync (22:54 run): #799/#800/#802/#804 merged, mobile-audit red on twenty-four heads (one green break), Vercel free-plan deploy limit hit again

**What changed:** `STATE.md` only (handoff + Known issues). Three merges since
the 22:00 sweep, all from the mobile-fix batch session: #800 (phone: a
slim home nav — the mark tucked under the clock, 22:52 CST, merge
`b8a566c`), #802 (mobile: the Capture sheet drags — the grip is real
now, 23:00 CST, merge `ea8979f`) and #804 (island: the deck fits a phone
— panels span the screen, the top bell drops, 23:07 CST, merge
`05c49a3`). #799 (editor: the scene gutter stays out of the phone's
script, 22:43 CST) also merged since the last STATE sync — it was open
when #801 was cut and is now on main (`f87aa0c`). #803 is open (settings:
film grain sliders — amount and speed, the owner asked for them
directly; head `c6e7758`), #805 is open (ui: every switch is the disc;
new push, head `e02c7242`), #806 is open (editor: the script scrolls
barless on a phone; head `d37ee82`). #784 stays PAUSED unmerged pending
the owner's word. This sync PR (#801) was rebased three times in one
night (onto `f87aa0c`, then `b8a566c`, then `ea8979f`, then `05c49a3`)
as the mobile batch kept merging under it.

**Mobile-audit is red on twenty-four PR heads since #788** — eleven more since
the thirteen in #801's first draft: #799 run 45941266347 (branch head
`f59c463`), #802 run 45941381409 (earlier head `d0968d6`), #800 run
45941642117 (merged head `949a106`), #803 run 45942172477 (head
`1439abb`), #804 runs 45942426955 (head `7a3ed2f`) and 45943197378
(rebased head `f9d53bb`), #803 run 45943359496 (head `c6e7758`),
#805 run 45943457628 (head `e02c724`), #803 run 45944356867
(rebased head `e37fe16`), #806 run 45944795228 (rebased head `e278624`),
#807 run 45944756407 (head `d947a97`) — read from the run logs. **But the streak
broke once: #802's audit on its merged head `3968294` completed SUCCESS
(run 45942483739)** — the first green audit since the streak began —
then #803's, #804's, #805's, #806's and #807's heads went red again, so the audit itself looks
flaky as well as the code. On the three newest completed heads the portrait signature is
steady (/hub, /today, /auth underBar 2) while the landscape set shrank:
#803's and #804's heads flag no landscape route as worse (only /cavern
underBar 1 in the table), where #800's head still had landscape /, /hub,
/today, /auth underBar 2. #804's deck-fit build did not move the portrait
counts. #803's head adds a new failing dimension of its own:
portrait and landscape /settings small 3 (allowed 1) — the new
film-grain sliders' small text; #803 has since rebased onto `05c49a3`
(head `e37fe16`, audit in progress). The red itself, not the exact
counts, is the stable fact. It is
not a required check, so #799/#800/#802/#804 merged with it red and the red
rides on main's HEAD (`05c49a3`). #805's audit run on `8ffc840` was
cancelled by its new push; #802's audit on its merged head is the green
run above. The mobile-fix session owns the fix —
the sweep does not touch the baseline and does not open a competing fix.

**Vercel's free-plan deploy limit hit again tonight**
(`api-deployments-free-per-day`, over 100): preview deploys fail on
#802–#808 since ~22:52 CST, so no PR preview
builds until the limit resets (~24h). The production deploy for #800 /
#802 is unverified and very likely also blocked — the owner's phone will
not see #800/#802 until a deploy lands. No code fix (RULES 9: fewer
deployments, not a bigger plan); the standing condition was already in
STATE §2b/§5 and the last hit was 2026-11-15.

**Main CI:** checks/database/sbom/history/changes success on `f87aa0c`
(#799 merge), on `b8a566c` (#800 merge), on `ea8979f` (#802 merge, CI run
45943186596) and on `05c49a3` (#804 merge, CI run 45943869169); CI on
`cdc01d7` (#803 merge) was still in progress at the time of this sync
(checks/database running) — next run confirms. Supabase Preview
failure is the standing non-required condition on every main merge.
#731 still open, 20 comments (updated 07:28 CST); tonight's nightly
(~04:40 CST Nov 27) is the fourteenth test, the first on the fixed HEAD
now including #792–#804 plus #803. Drift green (run 45931715972); newest migration
on main is still `20261126000100`, so the migration line stays correct —
`check-state-facts` clean, no warning. BACKLOG.md, backlog-detail.md and
`.perch/mcp.json` unchanged on main (blob SHAs `1cb6a9d8…`, `d26c08a5…`,
`7a03977e…`).

**Verified:** `node scripts/check-state-facts.mjs` clean, no warning;
`npm run sync-intel` no drift and `npm run bible` no drift (still 163
specs); typecheck pass; lint 0 errors (6 pre-existing warnings); test
472 files / 3775 passed / 26 skipped / 0 failed on the `05c49a3` tree,
plus build pass. Docs-only change — no code,
no migration, no behaviour change; the rebases onto `b8a566c`, `ea8979f`, `05c49a3` and `cdc01d7`
pulled in #800/#802/#804/#803 code only, which merged with green
required checks (branch CI green; main CI on `cdc01d7` still in
progress — next run confirms).
