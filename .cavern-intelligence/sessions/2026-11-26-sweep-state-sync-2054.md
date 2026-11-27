# 2026-11-26 — Sweep STATE sync, second pass: #785/#786/#788/#789/#790/#791 merged, drift green, mobile-audit red

**What changed:** `STATE.md` (handoff + migration line + Known issues) and
two one-line truths in `backlog-detail.md`. This extends PR #787, which was
opened at ~20:18 CST on HEAD `9813529` and is now rebased onto `57c6912`
(#791) with its handoff extended — the branch was behind `main` by six
merges, so the old handoff would have landed stale.

**Six merges since the last sweep:** #785 (WELCOME heading, owner's
greeting, BEGIN YOUR FILM section removed — the confirmed screenshot
reading, merged ~20:39 CST), #786 (Studio header as one unit, phone picker
at the iOS zoom floor — LIVE-VERIFIED by the owner on his phone ~21:19 CST,
"Pass on those 2"), #788 (project-office section — owner controls no
longer open the page), #789 (Advertising and Copywriting get their own
guide workflows), #790 (home: 'Jump back in' leads the signed-in home, per
the owner's phone note) and #791 (phone: 16px floor app-wide with a
settled reveal — the open 16px question is answered: the floor is app-wide,
in `app/globals.css` + `PhoneKeyboard`). #789 closes the format-coverage
audit's fallthrough finding: those two formats silently got the short-film
guide. The audit's finding is recorded in the sweep's
`hidden_files/brief-format-coverage-audit.md`, not in the backlog, so the
fix is noted on backlog-detail §3.32. #792 (studio: highlighted fields fit
their frames) is open.

**Drift is green again — resolved, with evidence:** the owner applied
migration `20261126000100` to production AND staging ~20:53 CST ("Done on
both", main chat). The sweep dispatched a drift re-run
(`workflow_dispatch`, run 45931715972 on `01a5330`) and it completed
**success** ~21:01 CST. The migration line now reads through
`20261126000100`, the Known-issues drift line is green again, and
backlog-detail §3.18 records the apply. The drift-red fingerprint
(`drift-red-20261126000100-unapplied`) is retired — do not re-surface it.
The Casting Board backfill is done.

**Mobile-audit is red on five PR heads in a row** (#788 run 45928029230,
#785 run 45928758702, #790 runs 45930483025 and 45931324691 on its final
head, #791 run 45932934838) — read from the run logs, not the counts:
"The phone audit got worse" against the baseline. First only portrait
/projects/<id> underBar 1 (that line is #788's HubTopBar /
VisibilityPicker change); on #790's head it grew to portrait /hub, /today,
/auth underBar 3 and landscape /, /hub, /today, /auth underBar 2,
identical on #790's final head and on #791's head — the 16px floor did not
move the counts. It is not a required check, so #785/#788/#790/#791 all
merged with it red and the red now rides on main's HEAD (57c6912). The
mobile-fix session owns the fix — the sweep does not touch the baseline
and does not open a competing fix. If the session's next audit run stays
red, the fix belongs to that session, not a baseline `--update`. **Owner
steer ~21:19 CST:** the answer bar (the buildable answer to the
un-removable Apple keyboard bar) is island/pill form with the capture (+)
button beside it and swipe gestures between fields/questions — NOT a
vertical stack. **#786 is LIVE-VERIFIED** by the owner on his phone ~21:19
CST ("Pass on those 2" — scroll-as-one-unit and picker no-zoom both pass);
its proof loop is closed.

**Main CI on the new HEAD** `57c6912` was still in progress at the time of
this sync (checks/database running; review/sbom/history/changes success;
Supabase Preview failure is the standing non-required condition) — next
run confirms. #787's own head `0a8d879` was all green before the rebases
(conventional, checks, database skipped, gate, risk/low); checks re-run on
the final rebased head. #790's final head `12c7ef9` had checks/gate/
conventional green with mobile-audit the only red — and it merged. #784
stays PAUSED unmerged pending the owner's word. #731 still open, 20
comments; tonight's nightly (~04:40 CST Nov 27) is the fourteenth test,
the first on the fixed HEAD now including #785/#786/#788/#789/#790/#791.

**Verified:** `node scripts/check-state-facts.mjs` clean, no warning (the
line now names the newest migration, `20261126000100`); `npm run
sync-intel` no drift (BACKLOG.md regenerated identical — the detail edits
are prose inside existing sections, no heading change) and `npm run bible`
no drift (still 163 specs); typecheck pass; lint 0 errors (6 pre-existing
warnings); test 465 files / 3751 passed / 26 skipped / 0 failed; build
pass. Docs-only change — no code, no migration, no behaviour change.
