# 2026-11-25 — e2e: two stale expectations behind part of the nightly red (#731)

Nightly run 45624398474 (2026-11-25, HEAD 2cc75980) failed all five shards,
14 hard failures + 2 flaky. Two of the failures trace to tests left stale by
the Nov 24 merges, not to app regressions:

1. **e2e/island.spec.ts** still expected the pre-#763 island reserve
   (64px at scale 1, 77px at 1.3). #763 raised PILL 42→48 in
   lib/island/scale.ts, so islandReserve(1) = 70 and islandReserve(1.3) = 84 —
   the values the lib unit tests already assert. The spec now expects 70/84.
2. **e2e/location-rename.spec.ts** located the renamed place with
   `getByRole('button', { name: /DINER/ })`. Since #756, the locations page
   also renders an "on purpose" notice button whose accessible name contains
   DINER ("It is on purpose: DINER has no cost…"), so the locator resolved to
   2 elements and died on a strict-mode violation. The matcher is now anchored
   (`/^DINER/`), which selects only the place row.

No app code changed. Still open from the same nightly (not touched here):
the places cluster (daylight deep-equality, locations "By scene" tab
timeout), the breakdown trio, and one-offs (island-call, task-edit, view-as,
editor-package, change-impact, phone-keyboard, admin-actions,
breakdown-doubt). Those need local-stack reproduction per spec.
