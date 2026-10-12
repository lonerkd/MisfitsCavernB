# Session — 2026-10-12: the deep brain, rung B9 — the reader says where it is unsure

**Built:**
- Confidence is now the decoder's own: forward-backward marginals over the screenplay grammar
  (`temperature: 3`), plus the runner-up reading as `meta.alternative`. A name seen speaking only
  once is capped at 70. (The old margin-based number could not tell clear lines from doubtful ones.)
- `lib/scriptos/review.ts` — `doubtfulReads(lines)`: lines below 75, least certain first, one per name, at most 12.
- Editor › Insights shows them (`components/editor/DoubtfulReads.tsx`): what the line was read as,
  **Not a character** / **It's a character** (project-wide corrections, B8), **Looks right** (hides it for now).
  Nothing is written to the script.

**Verified:** 920 unit tests, eslint, typecheck. **Not verified:** CI/e2e on a real build; how the
threshold feels on real scripts (needs the owner's).

**Still open (B8/B9):** line overrides as rules, per-writer memory, learning from edits.
