import { describe, expect, it } from 'vitest';
import { INTERNATIONAL, PLAIN, REAL_WORLD, generateScript, type Style } from './generate';
import { measureSuite, withObjectBeats } from './suite';

// ── The ratchet for the suite's context as priors (the rung after B7) ───────────────────────────────────────────────
// Measured 2026-11-27 on 30 seeded scripts per style, about half the action beats followed by an object on a line of its
// own in capitals ("THE LETTER") over a line of action (suite.ts). Macro-F1 / character F1 / action F1, object beats read
// as a cue, cast names invented per script:
//
//                          no suite context                 the breakdown knows the objects     + the bible knows the cast
//   PLAIN, no blanks       0.824 / 0.855 / 0.326  129/129 3.8   0.948 / 0.993 / 0.829   5/129 0.1    0.948 / 0.993 / 0.829
//   REAL_WORLD, no blanks  0.842 / 0.879 / 0.362  149/149 4.2   0.935 / 0.989 / 0.761  12/149 0.2    0.935 / 0.989 / 0.761
//   INTERNATIONAL, no bl.  0.826 / 0.844 / 0.335  167/167 4.8   0.932 / 0.969 / 0.778  11/167 0.2    0.938 / 0.990 / 0.780
//   every style, as typed  1.000 (the blank line under an object already says it is not a cue; the priors change no label)
//
// The cast from the suite changes no label where blank lines exist and asks about fewer lines (8 doubts to 0 on PLAIN): a
// cue spoken once is no longer a guess when a person put the name in the bible. A WRONG breakdown (a speaking character
// listed as a prop) costs that character's cues where it speaks fewer than three times (PLAIN as typed: cast found 0.916),
// the review asks about every one of them, and a person's "it's a character" takes the whole cost back (1.000).
// Floors sit a little under what is measured and may only be raised.
const STYLES: Array<[string, Style]> = [['PLAIN', PLAIN], ['REAL_WORLD', REAL_WORLD], ['INTERNATIONAL', INTERNATIONAL]];
const TIGHT_FLOOR: Record<string, { macro: number; character: number; action: number }> = {
  PLAIN: { macro: 0.94, character: 0.985, action: 0.82 },
  REAL_WORLD: { macro: 0.93, character: 0.98, action: 0.75 },
  INTERNATIONAL: { macro: 0.925, character: 0.96, action: 0.77 },
};
const TYPES = ['slug', 'action', 'character', 'dialogue', 'parenthetical', 'transition'] as const;

describe('the object beats the surface adds', () => {
  it('are deterministic and add objects to about half the action beats', () => {
    const els = generateScript(1000, REAL_WORLD);
    expect(withObjectBeats(els, 1000)).toEqual(withObjectBeats(els, 1000));
    const added = withObjectBeats(els, 1000).elements.length - els.length;
    expect(added).toBeGreaterThan(0);
    expect(added % 2).toBe(0); // an object line and the line under it
  });
});

describe('a script read with what the suite knows', () => {
  for (const [name, style] of STYLES) {
    it(`${name}, pasted without blank lines: the breakdown's objects stop being read as speakers, and nothing reads worse`, () => {
      const none = measureSuite(style, 'none', true);
      expect(none.objectCues).toBe(none.objectBeats); // without the suite every one is read as a cue
      for (const kind of ['things', 'both'] as const) {
        const r = measureSuite(style, kind, true);
        for (const t of TYPES) expect(r.score.perType[t].f1).toBeGreaterThanOrEqual(none.score.perType[t].f1 - 0.002);
        expect(r.score.macroF1).toBeGreaterThanOrEqual(TIGHT_FLOOR[name].macro);
        expect(r.score.perType.character.f1).toBeGreaterThanOrEqual(TIGHT_FLOOR[name].character);
        expect(r.score.perType.action.f1).toBeGreaterThanOrEqual(TIGHT_FLOOR[name].action);
        expect(r.objectCues / r.objectBeats).toBeLessThan(0.1);
        expect(r.castInvented).toBeLessThan(none.castInvented / 10);
        expect(r.castRecall).toBeGreaterThanOrEqual(none.castRecall);
        expect(r.sceneExact).toBe(none.sceneExact); // the suite never moves where scenes begin
        expect(r.score.perType.slug.f1).toBe(none.score.perType.slug.f1);
      }
    });

    it(`${name}, as typed: the suite changes no label, and the cast from the bible leaves fewer lines in doubt`, () => {
      const none = measureSuite(style, 'none', false);
      for (const kind of ['people', 'things', 'both'] as const) {
        const r = measureSuite(style, kind, false);
        expect(r.score.macroF1).toBe(none.score.macroF1);
        expect(r.changedElsewhere).toBe(0);
        expect(r.objectCues).toBe(0);
      }
      expect(measureSuite(style, 'people', false).doubts).toBeLessThan(none.doubts);
    });

    it(`${name}: a wrong breakdown entry is asked about, and a person's word takes its cost back entirely`, () => {
      const none = measureSuite(style, 'none', false);
      const wrong = measureSuite(style, 'wrong', false);
      expect(wrong.castRecall).toBeGreaterThan(0.9); // bounded: a character that speaks three times or more is still read
      expect(wrong.doubts).toBeGreaterThan(none.doubts); // and the review asks about the rest
      const settled = measureSuite(style, 'wrong-confirmed', false);
      expect(settled.score.macroF1).toBe(none.score.macroF1);
      expect(settled.castRecall).toBe(none.castRecall);
      const settledTight = measureSuite(style, 'wrong-confirmed', true);
      expect(settledTight.score.macroF1).toBe(measureSuite(style, 'things', true).score.macroF1);
    });
  }
});
