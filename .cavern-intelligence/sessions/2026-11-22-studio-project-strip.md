# Session - 2026-11-22: The Studio's project strip folds into the tab row

The Studio carried a full-width 58px bar whose only content was the "Active project" select, above the tab bar, all the time. The select now sits at the left of the sticky tab row (`app/(suite)/studio/page.tsx`), still a real `select` labelled "Active project" (so every e2e `selectOption` keeps working), 44px on touch, capped to 38vw on a phone; the bar and its CSS are gone and the tab row sticks at `top: 0`. The Lounge's top bar stays: it also carries the online-crew chip, so it is not an empty strip.

**Verified:** `lib/os/studio-project-strip.test.ts` (3 pass). Typecheck, lint, test and the Studio e2e specs: see the PR body.
