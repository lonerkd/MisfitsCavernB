# 2026-11-27 — STATE sync: fourteenth nightly e2e failed (hourly sweep)

**What changed:** the fourteenth nightly e2e test ran this morning (run
46004453288, 07:07–07:26 CST Nov 27) — the first on the fixed HEAD
`b9bdf253` — and FAILED on all five shards: 21 tests (4 + 6 + 3 + 3 + 5),
2 flaky. #731 is now 25 comments (5 new bot comments, one per shard), and
the sweep posted a full log diagnosis on #731 (comment 7220303509).

**Failing specs (from the run logs):** part 1 — accessibility (every page
passes), island-back-popovers (phone pill fully shown/gone while scrolling),
island-projects-keys (arrows/Enter/number choose), view-as-role (preview as
accountant/casting director/gaffer); part 2 — admin-sweep, community-page,
errors, fdx-export, island-onset-clock (320 px On set pill), phone-sheet;
part 3 — mobile (island/Today/no sideways scroll), mobile Pocket capture,
view-as; part 4 — home-routing (×2), island-compact-dock (global-chords
flaky once); part 5 — admin-actions (×2), breakdown-doubt, island (×2),
today-owner.

**Recurring from Nov 26:** breakdown-doubt, view-as / view-as-role,
island — #765/#767 did not clear them. Everything else is new this run.

**Deterministic leads:** a11y link-in-text-block on `/` — "Write a post"
to `/admin/hub`, contrast 1.55:1 (accent #f34013 vs #a8a888, needs 3:1);
a mobile color-contrast failure; today-owner strict-mode violation (2
elements match the `Flags` link); breakdown-doubt `toHaveCount`;
home-routing `toHaveURL`; admin-sweep `net::ERR_ABORTED` on `/admin/users`
and `/admin/analytics`. The rest reads as load (150 s / 120 s timeouts,
context destroyed by navigation). No single root cause in the logs — a fix
needs one spec reproduced alone first (RULES: e2e-red comes before the
backlog). No code fix attempted in this sync PR.

**What was stale, and the fix in this PR (`.cavern-intelligence/STATE.md`
only):** the handoff said tonight's run "is the fourteenth test" (not yet
run). It now records the run, its outcome, the #731 comment count and the
diagnosis pointer. Nothing else in the repo changed; BACKLOG needed no edit
(no item's state changed that it did not already record).

**Verified:** NOT verified locally — the local `npm ci` install's output
failed an execution-risk check on this machine, so no local npm verification
ran (no typecheck/lint/test/build, no sync-intel/bible run). Verification for
this docs-only change is the PR's own CI (`conventional`, `checks`,
`database`, `gate`), which runs the same checks on the branch and must be
green before merge. Nothing else in the repo changed; BACKLOG needed no edit
(no item's state changed that it did not already record).
