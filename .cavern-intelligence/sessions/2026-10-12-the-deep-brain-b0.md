# Session — 2026-10-12: the deep brain, rung B0 — the measure

Owner direction: a constantly improving, non-AI "deep brain" — lossless Fountain
first, then dozens of passes, then injected into the whole suite so the project's
context makes the reads better, and the reads make the suite better. Taken
literally: all of it. Written as [plans/2026-10-12-the-deep-brain.md](../plans/2026-10-12-the-deep-brain.md)
(layers L0–L7, rungs B0–B9, decisions for the owner).

**Built (B0):** `lib/scriptos/corpus/` — a seeded generator of fully labelled
screenplays with the real world's traps built in; renderers to text and to a PDF
(standard screenplay coordinates); a scorer (per-type precision/recall/F1,
accuracy, scenes and cast found); a runner that drives the real parser and the
real PDF path (stitcher → normaliser → parser); and a ratchet — a macro-F1 floor
per surface × style, in `corpus.test.ts`, that may only be raised. One product
change: `pdfImport.ts` exports `reconstructPageText` (and `PositionedItem`) so
the corpus can drive it directly; no behaviour change.

**Baseline** (30 seeded scripts per cell; full table in the plan): the parser on
a tidy script 0.929 macro-F1; on real-world traits 0.875; international 0.807.
The PDF path 0.574 / 0.480 / 0.433. A `12.`-style heading drops the parser to
0.719 and breaks every scene; on a *tidy* script a quarter of the cast is not
found (names with digits or full stops).

**Caution:** the generator is my model of scripts, so the number can be gamed by
overfitting to it. B1 (metamorphic tests, layout variants, and the owner's real
scripts as a private corpus) is the answer, and the first thing to do next.

**Verified:** 23 unit tests (generator, renderers, scorer, the ratchet); eslint
and typecheck; the matrix runs in about a second. **Not verified:** CI.

**Next:** B1; then B2/B3, which have named failing cases already (BACKLOG 3.20).
Owner: real scripts for a private corpus (kept out of the repo).
