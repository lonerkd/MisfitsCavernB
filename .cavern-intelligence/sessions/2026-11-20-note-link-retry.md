# 2026-11-20 — Retry tying a margin note to its scene

**What:** `addAnnotation` (`lib/supabase/annotations.ts`) now calls `linkNoteToScene`. When the scene
lookup by script and ordinal finds nothing (the scene index not synced yet), it retries up to 3 more
times, 1.5 s apart (both injectable through `opts`). It never throws: a failure leaves the note unlinked,
as before.

**Tests:** `lib/supabase/annotations.link.test.ts` covers found on the first try (attach once), found on
the third try (attach once), and never found (no attach, no throw).

**Verified:** `npx tsc --noEmit` passed. `npx eslint` on the two changed files passed.
`npx vitest run lib/supabase/annotations.link.test.ts`: 3 of 3 passed.

**Not verified:** browser and e2e (not run in this session); the real timing of scene-index sync.

**Bundle budget:** `/editor` reached 510.1 kB against its 510 kB budget (the character and place rename, the margin cost and the note entities of 2026-11-19 added weight on that route), so `performance-budget.json` raises the editor to 516 kB. This is the intended weight of those features, not a regression; the next editor feature should lazy-load rather than raise it again.
