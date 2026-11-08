# Session — 2026-11-02: the reader's thresholds are named

The document profile, the offer of a second reading and the Title Case cue scan used inline numbers (10 non-blank lines, 5% blank lines, a cap of 4, 2% of the probability, 28 characters, 2 heads). They are now `THRESHOLDS` in `lib/scriptos/thresholds.ts`, each with a sentence on what it decides, used by `decode.ts` and `parser.ts` (same values, so nothing the reader does changes), and listed in the generated parser reference. The type requires a description for every entry, so a new threshold cannot be added unexplained.

**Verified:** the 489 scriptos tests including the corpus ratchet (unchanged), the reference test (regenerated), typecheck, lint. No behaviour change.

**Not done, on purpose:** the profile's remaining facets (heading style, transition style). They would be guesses without real scripts to measure on; the backlog says so (3.21) and the private corpus is where they get built.
