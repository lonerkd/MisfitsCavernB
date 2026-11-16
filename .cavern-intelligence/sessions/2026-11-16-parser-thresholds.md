# Session — 2026-11-16: the reader's evidence numbers, named (BACKLOG 3.21)

A pure refactor. 36 numbers in `lib/scriptos/parser.ts` moved into `lib/scriptos/thresholds.ts`, each named with a line saying what it decides: the cue, name and heading length limits (`uncasedCueMaxLength`, `prescanCueMaxLength`, `prescanCueMaxWords`, `titlePageScanLines`, `capsSlugMaxLength`, `transitionToMaxLength`, `evidenceCueMaxLength`, `knownNameMaxWords`), the seen-once confidence cap, every score the evidence scorer awards (slug, transition, parenthetical, cue bonuses, action verbs and sounds, dialogue) and the score at which each type wins. `parser-reference.md` is regenerated and lists them all. Only numbers moved; no regex was touched. `normalize.ts` has no cut-off numbers (only counts inside patterns), so it is unchanged.

**Proof of identical behaviour.**
- The corpus matrix (`BRAIN_REPORT=1 vitest run lib/scriptos/corpus`) is the same before and after, line for line: text F1 1.000 for all 13 styles; PDF F1 PLAIN 0.999, REAL_WORLD 0.998, INTERNATIONAL 0.999, extensions 0.995, traps 0.998, parentheticals 1.000 (the rest 0.998 to 0.999); stability 1.000 on every transform; PDF layout sweep 0.998.
- A throwaway test (not committed) hashed `parseScript` output (ids removed) and `normalizeScreenplay` over 720 parses: three styles x 40 seeds x with and without blank lines x screenplay, podcast and game formats. The SHA-256 was `cbae512e...ee22` before and after.

**Left (in BACKLOG 3.21):** the roughly 50 per-branch confidence literals in the format-specific classifiers, and the inline patterns.
