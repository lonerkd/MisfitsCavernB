# 2026-11-26 — Sweep STATE sync: #792/#793/#794/#795/#796/#797/#798 merged, mobile-audit red on thirteen heads, #799/#800/#802 open

**What changed:** `STATE.md` only (handoff + Known issues). Six merges since
the last sweep, all from the mobile-fix batch session: #792 (studio:
highlighted fields fit their frames, 21:38 CST), #793 (island: the island
is the phone's surface — compact dock, Capture beside it, fitted both
orientations, 21:55 CST), #795 (phone: lounge layers you can leave, a back
that goes back, bars that step aside on focus — the overlay/back pattern,
22:09 CST), #794 (phone: home nav clears the clock; Learn links land on
the feed, 22:15 CST), #796 (portfolio: phone cards that fit, and a play
button only when it plays — the D0 quick fixes from the portfolio redesign,
22:23 CST) and #798 (island: the collapsed compact island is one row —
fixes the editor two-row wrap from the owner's phone trial, 22:29 CST).
#797 is open (brand: the pixel loader — LD1, the mark with a star on an
orbit, on every loading surface; current head `1f841c6`, audit running).
#784 stays PAUSED unmerged pending the owner's word.

**Mobile-audit is red on thirteen PR heads in a row** (#788 run 45928029230,
#785 run 45928758702, #790 runs 45930483025 and 45931324691, #791 run
45932934838, #792 runs 45933677333 and 45934647145, #793 run 45936168901,
#795 run 45937782163, #794 run 45938270588, #796 run 45938943841, #797
runs 45939666134 on its intermediate head `24b017e` and 45940328314 on its
merged head `1f841c6`) —
read from the run logs, not the counts. Count correction: earlier drafts of
this note said nine — the true count is twelve (1+1+2+1+2+1+1+1+1+1). The
signature moved: on #792's final head the "got worse" block was back to
only landscape / underBar 2 and portrait /projects/<id> underBar 1; on
#793's, #795's and #796's heads portrait /hub, /today, /auth underBar 2
(down from 3 on #790/#791 heads) with /projects/<id> and the landscape
routes clear; on #794's and #797's heads the landscape routes were back
too (/, /hub, /today, /auth underBar 2 alongside portrait /hub, /today,
/auth 2). The per-route counts move between runs (3 → 0 → 2 on /hub,
/today, /auth portrait across the #791/#792/#793 heads, and the landscape
set comes and goes), so the red itself, not the exact counts, is the
stable fact. It is not a required check, so all ten PRs merged with it red
and the red rides on main's HEAD (`09bd29a`). #798 merged with its audit
run cancelled by a rebase — no completed audit on its merged head. The
mobile-fix session owns the fix — the sweep does not touch the baseline
and does not open a competing fix.

**Owner direction, Nov 26 late evening (~21:47–22:08 CST, main chat):** a
pixel-art loader family from the brand mark (design only, not yet built); a
per-project brain (one needs-read + ranking, cavern viz, 2 owner decisions
flagged); the portfolio redesign (hero void, fake play button, phone grid
chops cards — D0 fixes are #796); the LIGHTING RULE (ambient light layers
oversized past the page edges, no hard seam on scroll); a SCALE AUDIT
demanded (the notch→pill→keyboard compensations fight each other, ScriptOS
mobile worst); the island-inheritance question open (pill descriptors,
PhoneToolStrip as the typing face, ⌘K via Search, project-brain next-up).
Since the note was drafted the owner closed the project-brain decisions
(Home loudness QUIET per-project line; cavern viz above the hub stats)
and set the caps-layer doctrine (the island EXPANDS functionality through
the Caps Lock layer, it is not a mirror of the mouse view) — both folded
into the handoff. Specs live in the goal workspace.

**Island phone trial (owner, ~22:14 CST, 4 screenshots):** Home's collapsed
pill PASSES and the open deck PASSES — it renders the editor's and Studio's
descriptors, so the descriptor inheritance already works in production;
ONE defect — in the editor the collapsed island wrapped to two rows, fixed
in #798 (`.main`/`.inline` flex-wrap in the compact face).

**Main CI is green across the board:** the #791 merge commit `57c6912`,
the #787 merge commit `9f693c1`, the #792 merge commit `0459fcd`, the #795
merge commit `3c9dd86`, the #793 merge commit `35db44a`, the #794 merge
commit `758820a`, the #796 merge commit `8a6e327` and the #798 merge commit
`b48c800` are all confirmed GREEN (checks/database/sbom/history/changes
success; Supabase Preview failure is the standing non-required condition).
CI on the new HEAD `09bd29a` (#797 merge) was still in progress at the time
of this sync (checks/database running) — next run confirms. #731 still open, 20
comments; tonight's nightly (~04:40 CST Nov 27) is the fourteenth test,
the first on the fixed HEAD now including #785/#786/#788/#789/#790/#791
plus #792/#793/#794/#795/#796/#797/#798. Drift green (run 45931715972);
newest migration on main is still `20261126000100`, so the migration line
stays correct — `check-state-facts` clean, no warning.

**Verified:** `node scripts/check-state-facts.mjs` clean, no warning;
`npm run sync-intel` no drift and `npm run bible` no drift (still 163
specs); typecheck pass; lint 0 errors (6 pre-existing warnings); test 467
files / 3759 passed / 26 skipped / 0 failed on the `758820a` tree, plus
build pass. Docs-only change — no code, no migration, no behaviour
change; the rebase onto `b48c800` pulled in #796/#798 code only, which CI
already verified green on their merge commits (see above), so the suite
was not re-run for the prose-only rebase. The suite ran twice during this
sweep: 466 files / 3755 passed on the pre-#794 tree, then 467 / 3759 on
`758820a` — the extra file/tests are #794's.
