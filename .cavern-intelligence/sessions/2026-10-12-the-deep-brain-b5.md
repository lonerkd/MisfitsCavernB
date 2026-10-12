# Session — 2026-10-12: the deep brain, rung B5 — the whole-document decoder

Sixth rung of [the deep-brain plan](../plans/2026-10-12-the-deep-brain.md), and the centre of it.

**What:** `lib/scriptos/decode.ts`. The classifier labelled each line once, in order, by
thresholds, so one weak line could corrupt the next. The decoder gives every line a cost for
each label it could have (how badly it fits) and chooses the labelling of the *whole script*
that costs least, where the screenplay grammar is itself a cost: dialogue belongs under a cue,
a parenthetical sits inside a speech, a cue needs a line beneath it, a blank line ends a speech.
A Viterbi search: deterministic, linear, no model. The weights are one table
(`DEFAULT_PARAMS`); change one, re-measure.

**How it plugs in:** the existing classifier still runs for each line's meta and the breakdown
elements; the decoder's label replaces its type (`ParseOptions.decoder`, default **on**, off
for comparison). Fountain-forced lines, title page, boneyard and the lone `^` are fixed points
it never second-guesses. Each line's confidence is how far its label beat the next best at that
line (40–100) — first time `confidence` means something.

**Fixed (three pinned gaps flipped):** shouted dialogue keeps its cue (`MAYA / STOP RIGHT THERE!`);
a `(beat)` between speeches is a parenthetical; an ALL-CAPS action line before action is action.
Also in the PDF path: a dialogue column of only shouting is still dialogue (a column between
the action margin and the cue column).

**Measured:** text macro-F1 now 1.000 in every style (was 0.886–0.959); PDF 0.995+ (was
0.826–0.939). **Be suspicious of that**: the weights and the generator share one mental model of
scripts. Independent evidence: all 850+ older tests pass with the decoder on (Fountain
conformance, round-trip, validator, analysis, metamorphic stability); 19 hand-written scripts in
`decode.test.ts`; 19 end-to-end specs (editor, gutter and cue card, undo, find/cast, table read,
shot designer, readiness, daylight, continuity, call sheets, Studio journey) on a real build;
and probes written after the first result, which found and fixed two weaknesses (a six-word cue
name; a speaker who forgot the blank line above their cue). One regression found and fixed on
the way: the validator test showed an orphaned `(aside)` was being typed as action, hiding its
lint warning; a wrapped line outside a speech now stays a parenthetical.

**Cost:** about 12 ms more on a 5,800-line script (39 → 51 ms).

**Not verified:** the owner's real scripts (`.private-corpus/`); CI; the PDF reader on a real PDF.

**Debatable and pinned** (`decode.test.ts`): two caps lines in a row → the first is action, the
second the cue; an ALL-CAPS line with a blank above and prose below is a cue, as the Fountain
spec says.

**Next (B7):** the project's context as priors — known characters and aliases, cast, places and
the previous draft fed into the decoder as evidence (`isKnownName` is already the hook).
