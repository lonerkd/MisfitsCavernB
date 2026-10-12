# Session — 2026-10-12: the deep brain, rung B3 — the evidence layer

Fourth rung of [the deep-brain plan](../plans/2026-10-12-the-deep-brain.md): what a line *looks like*.
Stacked on B2 (#180). Six pinned gaps fixed; every corpus floor raised.

**Changed (`lib/scriptos/parser.ts`):**
- **Scene headings:** a number may be followed by a full stop (`12. INT.`, `12A. INT.`); a bare
  word is a heading only if the line also looks like one (a dash before the time, or all
  capitals) — so `Interior lights flicker on.` is action, `INT. …`, `I/E …`, `int. house - day`
  and `INT HOUSE - DAY` stay headings. The location/number parse follows.
- **Transitions with or without punctuation:** `FADE OUT.`, `CUT TO BLACK.`, `DISSOLVE TO`,
  `SMASH CUT TO`, `FLASH CUT TO:` … (one `isTransitionText`, a small bare-vocabulary set).
- **Case in any alphabet:** `isCaps` judges Cyrillic/Greek/accented capitals, not only a–z; scripts
  with no capitals (CJK, Arabic, Hebrew) get their own cue test — short, unpunctuated, after a blank
  line, with a line directly under.
- **Names kept as written:** `DR. LEE`, `OFFICER 2`, `MARY-ANN`, `JOSÉ`, `O'BRIEN` — only a trailing
  full stop and an extension are dropped; digits no longer disqualify a cue from the pre-scan.
- **Title page:** a keyword must START the line (`Draft 3`, `Written by …`), not appear anywhere in
  a sentence (`A cold draft blows through.`).

**Measured** (parser on text, macro-F1, before → after): PLAIN 0.929 → 0.949, REAL_WORLD 0.875 →
0.924, INTERNATIONAL 0.807 → 0.928, dotNumbers 0.719 → 0.949, nonLatin 0.766 → 0.949. Cast found
72% → 100%; scenes exact 100% in every text cell. PDF barely moved (stitcher is B6). Floors raised
to match.

**Tests:** the six `it.fails` became `it`; `evidence-b3.test.ts` (56) covers each rule and its
false-positive guards.

**Still wrong in the text read (B5, pinned):** shouted dialogue after a cue loses both lines; a
`(beat)` mid-speech becomes dialogue; ALL-CAPS action followed by action becomes a character. They
need the whole-document decoder, not another threshold.

**Verified:** `npm run test`, eslint, typecheck. **Not verified:** CI; real scripts (none supplied —
`.private-corpus/` would turn "better on the generator" into "better on yours").
