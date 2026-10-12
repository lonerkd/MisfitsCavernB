# Session — 2026-10-12: the deep brain, rung B7 — context in (first slice)

Seventh rung of [the deep-brain plan](../plans/2026-10-12-the-deep-brain.md): the rest of the suite
makes the reads better.

**Built:**
- `ParseContext` on the reader (`parseScript(text, format, learned, { context })`):
  `characters` (known — a cue with that name is believed, even a long one) and `rejectedNames`
  (a person said it is not a character — never a cue, never counted as a speaker). Names are
  matched however they were typed; a rejection beats knowing. The decoder gets
  `isRejectedName` and a `rejectedName` weight; the old line-by-line read honours the same context.
- `lib/scriptos/context.ts`: `contextFromCastings` (the characters people have cast) and `contextKey`.
- The editor reads with the project's castings (it reads them before it parses), and the Studio's
  scene sync reads with the same ones — the two surfaces that write the scene index.

**Two decisions that matter:**
- **Only what a person put there.** The `characters` table is derived from the reader's own output;
  feeding it back would let one wrong read confirm itself. Castings and rejections are human.
- **No places yet.** A heading recognised only through a known place would make the editor and
  the Studio disagree on where scenes begin. A test pins that context never changes scene
  boundaries; places wait for one shared context provider (BACKLOG 3.22).

**Found by the tests:** a known name typed in lower case was not matched (the lookup was
case-sensitive); fixed by normalising context names on the way in.

**Verified:** 11 new tests (`context-b7.test.ts`), 885 in all; eslint, typecheck; 13 end-to-end
specs on a real build (casting, hiring, editor, gutter and cue card, undo, table read,
readiness, continuity, Studio journey, beat to script). **Not verified:** CI; the effect on real
scripts — the first slice is deliberately small (a known name helps only where a cue is
ambiguous), and nothing measures that without the owner's scripts.

**Next (B8):** memory and corrections — a per-project table for rejected names (and confirmed
ones), a "not a character" action in the Character Bible, and line overrides as rules.
