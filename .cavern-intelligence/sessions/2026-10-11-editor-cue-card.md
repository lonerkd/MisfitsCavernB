# Session — 2026-10-11: the editor's cue card (E2, second piece)

Stacked on the scene gutter (#170); part of the
[editor-on-the-graph plan](../plans/2026-10-11-editor-integration.md).

**Built:** with the caret on a character's cue, a small card in the script's
right margin beside that line: who plays them (the casting's username, or "Not
cast yet"), their **look in this scene** (continuity, `scene_states`, or "No
look for this scene"), and their speeches and scenes across the script.
`lib/film/cue.ts` (pure, 6 tests), `CueCardOverlay.tsx` (an overlay like the
gutter and `CutNoteMarkers`), `cue` on the editor context. It follows the
caret, not the mouse: it works from the keyboard and on touch, and the card is a
`role="note"` a screen reader reads as one sentence. Read only; it hides under
720px wide.

**Caught in passing:** the first wiring normalised the cue name with an inline
regex whose backslashes were lost in transit and would have matched the wrong
text; it now uses the shared `cueName` (`lib/film/sides.ts`).

**Verified:** `npm run test` (688), eslint/typecheck, `editor-gutter.spec.ts`
(now 2 tests: the gutter, and the cue card — absent on a heading, present on the
cue with actor and look, gone on the dialogue, script untouched), and on the same
build: accessibility (every page), beat-to-script, editor-project-script,
script-share, split, studio-journey. **Not verified:** phone width, the other
e2e shards (CI).

**Next (E2):** location suggestions in the heading, then the full scene card in
the right panel. Then E0's safety-net specs (co-writing, offline, rename) before
E1/E3.
