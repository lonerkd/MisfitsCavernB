# The deep brain — the script engine, built to keep getting better

**Status: B0–B3 and B5–B6 built; B4's first slice and B7–B9's first slices shipped.**

Owner: *"We need a constantly improved, but increasingly intuitive and
intelligent core — a deep brain of rules and systems. Fully lossless Fountain
first; on top of it a non-AI brain with dozens of passes and parses; and then
that brain injected into a complete suite of tools that cross-contextualise and
expand the project, so the accuracy of the reads goes up in return."*

This plan takes that at face value, and replaces the two comparisons made on
2026-10-11 (the old "Deep Brain 3.0" parser and import modal against today's)
with something that can be steered: a measure, a target architecture, and a route
where every rung has a number it must move.

## 1. What "the brain" is, honestly

A **layered, deterministic, explainable inference engine** over the script text.
No model, no network, same answer every time, every decision with its evidence.
It gets better three ways that need no machine learning:

1. **Better rules and better decoding** (we write them, the corpus proves them).
2. **Context** — the rest of the suite knows things the page doesn't (the cast,
   the places, the last draft); fed back in, they remove whole classes of doubt.
3. **Memory** — what this project and this writer have confirmed or corrected
   becomes counts and rules that bias the next read (statistics, not a model).

The comparison the owner draws (a game's NPC brain, an ML chat model) is about
*ambition and shape*: many cooperating subsystems, state, memory, context. This
is honestly a smaller thing than either, and says what it cannot do: it will not
understand a script the way a reader does, and an unusual script will still beat
it. What it can do is read the *form* of nearly any script correctly and say how
sure it is, and be the thing the rest of the suite stands on.

## 2. The layers

| | Layer | Does | Today |
|---|---|---|---|
| L0 | **Lossless Fountain** | Spec syntax is classified exactly, never guessed; the text round-trips byte for byte | Mostly built (`preClassify`; round-trip tests). Gaps: trailing-caret dual dialogue; title-page keys read as action |
| L1 | **Evidence** | Per-line features, unicode-aware: case, length, punctuation, vocabulary, indent (PDF), position | Thin: `isCaps` is a–z only; vocabulary sets are small; features are inline in one function |
| L2 | **Structure passes** | Blocks, speech state, scene segmentation, title page vs body, dual dialogue | One forward pass with a few flags |
| L3 | **Document profile** | What *this* script's conventions are: how it writes cues, numbers headings, punctuates transitions, indents | First slice: explicit cue names/case, heading numbers, transition endings |
| L4 | **Decoder** | The best labelling of the *whole document* given the screenplay grammar and all evidence — a Viterbi-style search, not a greedy threshold per line | None (greedy, so one weak line can corrupt the next) |
| L5 | **Context** | The project's graph as priors: known characters and aliases, cast, places, last draft, format, crew vocabulary | Cast/rejections, place canonicalization, repeated previous-draft cues |
| L6 | **Memory and corrections** | Confirmed names, rejected names, line overrides become priors and rules, per project and per writer | Project name corrections and script-scoped line overrides |
| L7 | **Reads out** | Scenes, cast, story time, locations, breakdown, timing, sides — and the confidence of each | Built, and the consumers trust every field equally (several fields are stubs: see BACKLOG 3.20) |

The importers (PDF, FDX, Fountain, plain text) feed L1/L3 with their own
evidence — a PDF contributes *geometry* — and then share everything above.

## 3. The central move: decode the whole document

Today each line is labelled once, in order, by thresholds on a handful of scores
(`>= 90`, `>= 95`, `>= 60`). So `MAYA` followed by a shouted `STOP!` loses both
lines, a caps action line followed by action becomes a character, and a
`(beat)` mid-speech becomes dialogue — each because a *local* score looked
weak, though the *whole* script makes the right reading obvious.

The decoder labels every line with the type that makes the best consistent
document:

- **Emission score** per line and type, from the evidence (L1/L3/L5).
- **Grammar** of screenplay: which type may follow which (dialogue only after a
  cue, a parenthetical or dialogue; a parenthetical inside a speech; a cue
  starts a speech; …), as costs, not walls — a script may break the grammar, at
  a price the evidence has to pay for.
- **Search** for the minimum-cost labelling over the whole document (dynamic
  programming; linear in length for a grammar this small).

That is deterministic, fast enough on the main thread (and movable to a worker),
and gives a calibrated confidence per line from the margin between the best and
second-best path. It is the closest honest equivalent of "the system considers
everything at once" without learning anything.

## 4. Context: the suite makes the brain smarter, and the brain makes the suite smarter

The loop the owner described, concretely. Priors the parser can take, by source:

| From | Prior | Settles |
|---|---|---|
| `characters`, `scene_characters`, `character_castings` | the known cast, aliases, who plays them | is `MARY-ANN` a cue? (it's a known character); is `THE DOOR EXPLODES.` one? (it isn't) |
| `project_locations` | the places that exist | heading vs sentence ("Interior lights…") |
| the previous draft / revisions | what this script looked like last time | a line that was a cue last draft almost certainly still is |
| `scenes` with confirmed story time | where the story is | day rollovers, flashbacks |
| project format and brief | screenplay, teleplay, podcast… | grammar variant |
| breakdown elements and tags | what the production already named | which ALL-CAPS words are props, not cues |
| memory (L6) | what writers confirmed or fixed | the long tail |

And back out: every read carries confidence and evidence, so the suite can ask a
person only about the doubtful lines, the graph is written from the confident
ones, and a correction made anywhere (editor, Studio, call sheet) improves the
next read. This is why the importers and the editor cut-over (editor plan E4–E6)
belong to the same programme.

## 5. How it is measured

The old parser claimed "near-perfect accuracy across thousands of script styles"
and never measured it. The first thing built here is the measuring stick, in
`lib/scriptos/corpus/`:

- a **seeded generator** of fully labelled screenplays with the real world's
  traps built in (numbered headings four ways, transitions punctuated three
  ways, shouted dialogue, hyphenated/accented/non-Latin names, sentences that
  look like headings, caps action, parentheticals mid-speech);
- renderers for the surfaces a script arrives on: **text**, and a **PDF** (the
  text items a PDF reader reports, at standard screenplay coordinates);
- a **scorer**: per-type precision/recall/F1, accuracy, and the two things the
  suite is built on — scenes found and cast found;
- a **ratchet**: the matrix of surface × style, with a floor per cell that may
  only be raised (as the coverage floors are).

Baseline, 2026-10-12, macro-F1 on 30 seeded scripts per cell:

| style | parser on text | PDF import |
|---|---|---|
| PLAIN (a tidy script) | 0.929 | 0.574 |
| REAL_WORLD | 0.875 | 0.480 |
| INTERNATIONAL | 0.807 | 0.433 |
| dotNumbers (`12. INT.`) | 0.719 | 0.335 |
| letterNumbers (`12A INT.`) | 0.929 | 0.414 |
| periodTransitions (`FADE OUT.`) | 0.901 | 0.545 |
| bareTransitions (`DISSOLVE TO`) | 0.849 | 0.481 |
| shouting | 0.869 | 0.535 |
| oddNames | 0.929 | 0.496 |
| nonLatin | 0.766 | 0.467 |
| extensions | 0.940 | 0.553 |
| traps | 0.897 | 0.563 |
| parentheticals | 0.923 | 0.539 |

What the baseline already says: on a *tidy* script a quarter of the **cast is not
found** (names with digits or full stops — `OFFICER 2`, `DR. LEE` — are dropped
or mangled); a `12.`-style heading breaks every scene; and the PDF path loses
nearly half of what it reads, mostly because it ignores the blank lines between
elements and reads cues by a character class.

**The generator is my model of scripts, so the measure can be gamed by
overfitting to it.** Three guards: (1) the stress styles isolate one trait at a
time, so a rule can't hide behind an average; (2) **metamorphic tests** (B1):
rewrite a script in an equivalent way — CRLF, indentation, A4 vs Letter, caps
cues vs colon cues — and the read must not change; (3) a **private corpus of
real scripts** (owner's own, never committed) scored the same way: see §8.

### What B1 found

- **The parser is perfectly stable** under every equivalent rewrite — CRLF, trailing spaces, indentation, doubled blank lines, no final newline, leading blanks: 1.000 for every style. A real strength, now locked in (the floors are 1).
- **The PDF reader is not layout-robust, but layout is not yet its main problem.** On the realistic-traps style its score is flat (0.480) from a 1 in margin to a 2 in margin and from 0.85× to 1.2× scale, because structure loss (cues swallowed, paragraphs merged) dominates. The one cliff: a ~0.5 in left margin drops it to 0.305, where the fixed x-range stops seeing cues. Layout becomes the bottleneck only after the structure fixes (B6).
- **A private corpus is wired**: `.private-corpus/` (git-ignored) is read by `lib/scriptos/corpus/private.test.ts` — lossless, stable, and a line-by-line diff of every change in how a line is read since the last snapshot (`BRAIN_UPDATE=1` accepts it). No labels needed; skipped when the folder is absent.

### Baseline after B3 (macro-F1, parser on text → was)

PLAIN 0.949 (0.929) · REAL_WORLD 0.924 (0.875) · INTERNATIONAL 0.928 (0.807) · dotNumbers 0.949 (0.719) · nonLatin 0.949 (0.766) · shouting 0.886 (0.869) · parentheticals 0.943 (0.923). **Cast found: 72% → 100%** on a tidy script. Scenes found exactly: 100% in every text cell. The PDF path moved only 0.01–0.04 (its stitcher is untouched until B6). What is left in the text read is the whole-document kind of error: shouted dialogue after a cue, `(beat)` mid-speech, caps action — B5.

### Baseline after B6 (macro-F1, PDF path → was)

PLAIN 0.948 (0.574) · REAL_WORLD 0.922 (0.480) · INTERNATIONAL 0.927 (0.433) · every margin and scale 0.886+ (the ~0.5 in margin cliff, 0.305, is gone). Scenes found exactly: 100% in every PDF cell; cast found 100%. The PDF path now reads within a hair of typed text, so what limits it is the parser (B5), not the reader.

### Baseline after B5 (macro-F1, text → was)

Every text cell 1.000 (was 0.886–0.959); every PDF cell 0.995+ (was 0.826–0.939); every layout 0.998. **Read this number with suspicion**: the decoder's weights and the generator come from the same mental model of scripts, so a perfect score on the generator proves less than it looks. What does not come from the generator: all 800+ older tests (Fountain, round-trip, validator, analysis, editor and Studio end-to-end) pass with the decoder on; 19 hand-written scripts in `decode.test.ts`; and probes written after seeing the first result, which found and fixed two real weaknesses (a six-word cue name; a speaker who forgot the blank line above their cue). The owner's own scripts (`.private-corpus/`) are still the only independent check.

### B7, and one rule that shapes it

The reader takes a `ParseContext` (`parseScript(text, format, learned, { context })`): cast characters, rejected names, project locations, repeated confident character cues from the previous draft, and saved line decisions. A known name is believed even when it is too long to look like one; a rejected name is never a cue. Previous-draft names are weaker evidence than castings. Known locations only canonicalize the location of an already-recognized scene; context cannot create or remove a scene boundary.

**Only what a person put there goes in.** The `characters` table is derived from the reader's own output, so feeding it back would let one wrong read confirm itself forever. Castings and rejections are human decisions.

The editor and Studio build this context from the same project sources before parsing and syncing the scene index. Tests pin that places and previous-draft evidence do not change scene boundaries. Line corrections are keyed to exact trimmed text plus its occurrence in the script, so edits to the target text stop applying stale decisions.

## 6. The route

Every rung ships on its own, and ends with named numbers moving. Sizes: S ≈ an
hour or two · M ≈ a session · L ≈ several sessions · XL = a project.

| # | Rung | Does | Size | Moves |
|---|---|---|---|---|
| B0 | **The measure** *(built)* | corpus, scorer, ratchet, baseline | M | — |
| B1 | **Make it harder to fool** *(built)* | metamorphic tests; layout variants for the PDF renderer (margins, page size, font size); the private-corpus runner | M | the measure's honesty |
| B2 | **L0 complete** *(built: import as written, title page, trailing-caret dual dialogue; still to do: the spec's own example suite, round-trip as a property test)* | trailing-caret dual dialogue, title-page keys, every Fountain construct in the spec's own examples; Fountain *import* as-is (no rewriting); round-trip as a property test | M | Fountain gaps (BACKLOG 3.20 #2 and the `^` gap) |
| B3 | **Evidence layer (L1)** *(built)* | unicode-aware case and names; a vocabulary module (transitions, time words, extensions, camera cues, structural markers) merged from both old and new; the numbered-heading fix; names kept as written (`DR. LEE`, `OFFICER 2`) | M | dotNumbers, periodTransitions, bareTransitions, nonLatin, cast found |
| B4 | **Document profile (L3)** *(first slice built)* | summarizes explicit cue names/case, heading-number styles, and transition punctuation; explicit cues inform later unmarked reads without overriding Fountain syntax | M | REAL_WORLD, INTERNATIONAL |
| B5 | **The decoder (L4)** *(built)* | grammar-constrained best-path labelling; calibrated confidence; replaces the greedy classifier **only when it beats it on the whole matrix** (the old classifier stays as the fallback until then) | L | shouting, traps, parentheticals, PLAIN |
| B6 | **The PDF reader rebuilt** *(built)* | geometry-first: cluster x-positions into the document's own columns (not 180–350); respect vertical gaps; page-edge artifacts (page numbers, CONTINUED, MORE) by position; scanned-PDF detection with a message; the reader feeds the same decoder | L | every PDF cell |
| B7 | **Context in (L5)** *(first slice built: cast, rejected names, places, previous draft)* | `parseScript(text, { context })` fed from the graph; editor and Studio share it when reading and syncing scenes | L | cast found, scenes exact on the hardest styles |
| B8 | **Memory and corrections (L6)** *(first slices built: project name corrections and script-scoped line overrides; private per-writer memory remains undecided)* | project-level name verdicts and script-scoped line decisions become durable priors/rules; the editor can set and undo line decisions | L | long-tail accuracy, measured on the private corpus |
| B9 | **Reads out with confidence (L7)** *(built: editor review of doubtful reads and name corrections)* | consumers use confidence; a reading-review screen asks about only the doubtful lines; stubs removed | M | trust, not an F1 |

Order is deliberate: **measure → make the measure hard to fool → complete the
exact layer → fix the evidence → decode → rebuild the importer on it → then
context and memory**, because context and memory multiply a good read and just as
happily multiply a bad one.

## 7. Where it touches everything else

- **The editor plan** (`2026-10-11-editor-integration.md`): the CRDT (E3) and
  rename-as-rewrite (E4) need the brain's names to be exact (`DR. LEE` must stay
  `DR. LEE`). The cue card and the gutter already read the brain's output.
- **The film graph**: characters, scenes and story time are written from the
  brain's confident reads; the graph's confirmed facts are the brain's best
  priors (B7). The two should be designed together from B7 on.
- **Performance**: the parse runs on the main thread on every change (deferred).
  The decoder must stay linear and incremental where it can (re-read only the
  changed region and its neighbours), and move to a worker if the matrix says it
  costs too much. A render-cost baseline (editor plan E0, still undone) comes first.
- **Determinism and ids**: line ids are random per parse today; scene identity
  survives through `planSceneSync`. The brain keeps that contract.

## 8. Decisions for the owner

1. **A private corpus of real scripts.** The measure is only as honest as its
   inputs. Your own scripts, and any you have the right to use, kept outside the
   repository (or in a private, gitignored folder), scored by the same runner.
   Without them I can only measure against my own model of scripts.
2. **Memory scope (B8).** Per project (safe, shared with the crew) and per writer
   (private), or both. And whether corrections should ever cross projects.
3. **Worker or main thread.** Decide at B5 from the measured cost; no action yet.
4. **The name.** "The deep brain" is the working name from the old parser; if the
   suite should call it something (it will surface as "reading", "confidence",
   "review"), say so before B9.

## 9. Progress

B0–B3 and B5–B6 are built and measured by the ratchet in `lib/scriptos/corpus/`.
B4 profiles the explicit conventions available in Fountain source; broader
inference still needs independently labeled scripts. B7's first slice feeds
castings, rejections, places, and previous-draft names into the shared editor
and Studio context without changing scene boundaries. B8 has project-scoped
name corrections and script-scoped line overrides with undo; private per-writer
memory remains an owner decision. B9's editor review surfaces doubtful reads.
Remaining work is listed in BACKLOG §3.21. The private corpus remains the
independent check and requires scripts the owner has the right to use.
