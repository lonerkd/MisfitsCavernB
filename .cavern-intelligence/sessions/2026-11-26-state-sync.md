# 2026-11-26 — STATE sync (owner request)

**What the owner said:** "pickup the state and sync it" — bring the repo's own
data files back in line with what is actually true and being worked on, and
(from the same message) keep them that way: the hourly repo sweep now carries
the sync as a standing duty, alongside fixing failing scheduled runs.

**What was stale, and the fix in this PR (`.cavern-intelligence/STATE.md`
only):**

- The migration line said production and staging match `main` through
  `20261122000700`, checked 2026-11-23. The three 2026-11-23 migrations
  (`20261123000100` held pushes released after quiet hours, `20261123000200`
  phase cast complete, `20261123000300` shoot-soon permit notices) were
  applied to production and then staging on 2026-11-24, the post-apply checks
  matched on both projects, and the Production Schema Drift run passed. The
  line now names all three and the 2026-11-24 check; `check-state-facts` no
  longer warns about a newer migration than the one named.
- The handoff was dated 2026-11-23 and described the board as of #744. It now
  reads 2026-11-26: the takeover merges and migration applies (2026-11-24),
  the 2026-11-26 merges (#765, #766, #767, #655, #747, #768, #769), #731 still
  open pending a green nightly, the owner's restructure queue (phase 7 Thin
  pages, then phase 8 Studio routes), the widened mandate, and the sweep's
  new standing duties.

**Verified:** `node scripts/check-state-facts.mjs` reports no migration
warning after the edit; `npm run sync-intel` produces no drift. Nothing else
in the repo changed; BACKLOG needed no edit (no item's state changed that it
did not already record).
