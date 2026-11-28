# 2026-11-28 — nightly e2e, fifteenth failure (run 46144406947)

## What

The fifteenth nightly test, run 46144406947 (schedule, 06:23 CST), on HEAD
`22e12c39`: **all five shards failed, 26 tests failed** (4 + 7 + 5 + 4 + 6),
up from 21 in the fourteenth (run 46004453288). Diagnosis posted on #731
(comment 7239655996); #731 now 32 comments.

## Failing specs (read from the run logs)

- Part 1 (4): `accessibility` every page passes; `island-back-popovers`
  phone pill fully shown or fully gone while scrolling;
  `island-projects-keys` arrows/Enter/number choose a project;
  `view-as-role` preview as accountant/casting director/gaffer — the same
  four as the fourteenth.
- Part 2 (7): the fourteenth's six (`admin-sweep`, `community-page`,
  `errors`, `fdx-export`, `island-onset-clock`, `phone-sheet`) + `guides`
  an actor on the crew gets the crew guide for their craft (new).
- Part 3 (5): `breakdown-categories-phone` readiness leads the Breakdown
  tab (new); `island-call` join in the Lounge, work elsewhere, mute and
  leave (new); `mobile` the island, Today, nothing scrolls sideways;
  `mobile` Pocket capture a note and a link; `script-formats` opening each
  script writes scenes from its segments (new). `view-as` passed this run.
- Part 4 (4): `global-chords` Ctrl K opens search (new — was passing);
  `global-chords` split pane (was flaky, now hard-failing); `home-routing`
  signed-in person gets home at `/`, old addresses land there;
  `home-routing` phone same page, no second front-page entry;
  `island-compact-dock` touch phone keeps the tab bar, no dock.
- Part 5 (6): `admin-actions` hub post draft/publish/member reads;
  `breakdown-doubt` doubtful scene carries the note; `brief` answer the
  brief, names needs, prefills the job (new); `island` rests, opens, yields
  to typing, takes keys under Caps Lock; `island` Settings size resizes at
  once and is kept; `today-owner` crew see no such flags.
  `admin-actions` Settings/search offer passed this run.

## Deterministic leads

- `accessibility` is the same defect as the fourteenth — the "Write a
  post" link to `/admin/hub` on `/`, contrast 1.55:1 (accent `#f34013` vs
  surrounding `#a8a888`, needs 3:1), desktop and mobile. Fixed by #844
  (underline the link, `components/community/HubFeed.tsx:61`); the next
  scheduled nightly run is the check that the spec goes green.
- `today-owner` strict-mode violation — 2 elements match the `Flags` link
  — repeats. `mobile` color-contrast failure repeats.

## New observation

Shards 1 and 4 show 18 `Error response from daemon: error from registry:
Data limit exceeded` lines each during the image pulls at the local-stack
step — the same signature as the main-CI database flake on `3476f6ec` (run
46139639040). The stack still started ("Started supabase local development
setup" 12:25:00Z) and migrations applied, and shards 2, 3 and 5 failed
7/5/6 tests with zero such lines — so the registry errors do not explain
the failures.

## Root cause

Still no single root cause — 26 failures across every shard, mixed
deterministic and load signatures. Per #731's rule, reproduce one spec
alone first before fixing; the deterministic leads above are the place to
start. The sweep's one fix attempt this run was the `accessibility`
signature (#844).
