import { describe, expect, it } from 'vitest';
import { INTERNATIONAL, PLAIN, REAL_WORLD, type Style } from './generate';
import { measureTight } from './run';
import { earlierDraft, measureTightWithEarlier } from './previous';
import { measureHandwrittenWithEarlier } from './previous-hand';
import { measurePlaces } from './places';
import { generateScript } from './generate';

// ── The ratchet for B7(b): the previous draft and the places as evidence ────────────────────────────────────────────
// Measured 2026-11-21 on 30 seeded scripts per style, each pasted with no blank lines (the surface where action under a
// speech is ambiguous), the later draft read WITHOUT and WITH an earlier draft derived from it by seeded edits (about 10%
// of speeches and action cut, 8% of lines reworded, new action lines added; previous.ts). Macro-F1 and action F1:
//
//                    without          earlier draft read as it was    earlier draft kept its blank lines   a person settled every line
//                                     ("same": engine alone)          ("blanks")                           ("corrected")
//   PLAIN            0.923 / 0.661    0.929 / 0.690                   0.989 / 0.955                        0.989 / 0.955
//   REAL_WORLD       0.919 / 0.620    0.922 / 0.636                   0.994 / 0.975                        0.994 / 0.975
//   INTERNATIONAL    0.907 / 0.597    0.910 / 0.615                   0.991 / 0.968                        0.992 / 0.968
//   hand-labelled    0.909 / 0.742    0.909 / 0.742                   0.953 / 0.891                        0.949 / 0.891
//
// The earlier draft's engine-only reading ("same") adds nothing the engine did not know, and the rule that only lines the
// earlier reading was sure of carry over keeps it from doing harm there (without that rule the hand-labelled set lost 0.003
// and one invented cast name appeared). Floors sit a little under what is measured and may only be raised.
const BLANKS_FLOOR: Record<string, { macro: number; action: number }> = { PLAIN: { macro: 0.98, action: 0.94 }, REAL_WORLD: { macro: 0.985, action: 0.96 }, INTERNATIONAL: { macro: 0.98, action: 0.95 } };
const NONE_FLOOR: Record<string, number> = { PLAIN: 0.92, REAL_WORLD: 0.915, INTERNATIONAL: 0.9 };
const STYLES: Array<[string, Style]> = [['PLAIN', PLAIN], ['REAL_WORLD', REAL_WORLD], ['INTERNATIONAL', INTERNATIONAL]];

describe('the earlier draft the surface derives', () => {
  it('is deterministic and shares most of its lines with the later draft', () => {
    const later = generateScript(1000, REAL_WORLD);
    expect(earlierDraft(later, 1000)).toEqual(earlierDraft(later, 1000));
    const had = new Set(earlierDraft(later, 1000).map((e) => e.text));
    const kept = later.filter((e) => had.has(e.text)).length / later.length;
    expect(kept).toBeGreaterThan(0.75);
    expect(kept).toBeLessThan(0.99); // and is not a copy
  });
});

describe('scripts pasted without blank lines, read with the previous draft', () => {
  for (const [name, style] of STYLES) {
    it(`${name}: never reads worse for having it, and reads far better when the earlier draft was sure`, () => {
      const none = measureTightWithEarlier(style, 'none');
      expect(none.score.macroF1).toBe(measureTight(style).score.macroF1); // no previous draft: byte for byte the reading that was already measured
      expect(none.score.macroF1).toBeGreaterThanOrEqual(NONE_FLOOR[name]);
      for (const kind of ['same', 'blanks', 'corrected'] as const) {
        const r = measureTightWithEarlier(style, kind);
        expect(r.score.macroF1).toBeGreaterThanOrEqual(none.score.macroF1); // no class of earlier draft reads worse
        for (const t of ['slug', 'character', 'parenthetical', 'transition'] as const) expect(r.score.perType[t].f1).toBeGreaterThanOrEqual(none.score.perType[t].f1 - 0.002);
        expect(r.castRecall).toBeGreaterThanOrEqual(0.98);
        expect(r.castInvented).toBeLessThanOrEqual(Math.max(0.1, none.castInvented));
        expect(r.sceneExact).toBe(none.sceneExact); // the previous draft never moves where scenes begin
      }
      const blanks = measureTightWithEarlier(style, 'blanks');
      expect(blanks.score.macroF1).toBeGreaterThanOrEqual(BLANKS_FLOOR[name].macro);
      expect(blanks.score.perType.action.f1).toBeGreaterThanOrEqual(BLANKS_FLOOR[name].action); // action under speech: about 0.6 without
      expect(blanks.score.macroF1 - none.score.macroF1).toBeGreaterThan(0.05);
      expect(measureTightWithEarlier(style, 'corrected').score.macroF1).toBeGreaterThanOrEqual(blanks.score.macroF1 - 0.005);
    });
  }

  it('the hand-labelled scripts, which the generator and the decoder never shared a model with, agree', () => {
    const none = measureHandwrittenWithEarlier('none');
    expect(none.macroF1).toBeGreaterThanOrEqual(0.9);
    for (const kind of ['same', 'blanks', 'corrected'] as const) expect(measureHandwrittenWithEarlier(kind).macroF1).toBeGreaterThanOrEqual(none.macroF1);
    const blanks = measureHandwrittenWithEarlier('blanks');
    expect(blanks.macroF1).toBeGreaterThanOrEqual(0.94);
    expect(blanks.perType.action.f1).toBeGreaterThanOrEqual(0.87);
    expect(measureHandwrittenWithEarlier('corrected').macroF1).toBeGreaterThanOrEqual(0.94);
  });
});

// Places: measured 2026-11-21, 30 seeded scripts per style, every second heading written without INT./EXT. (90 / 120 / 120
// of them). Without the project's places the review offers none of them as a scene heading; with them it offers all, and
// nothing else, and no label or scene count changes.
describe('the places the project knows', () => {
  for (const [name, style] of STYLES) {
    it(`${name}: a heading written without INT./EXT. is offered as a scene heading, and the reading itself does not change`, () => {
      const without = measurePlaces(style, false);
      const withPlaces = measurePlaces(style, true);
      expect(without.bare).toBeGreaterThan(50);
      expect(without.offered).toBe(0);
      expect(withPlaces.offered / withPlaces.bare).toBeGreaterThanOrEqual(0.95);
      expect(withPlaces.flaggedRight / Math.max(1, withPlaces.flagged)).toBeGreaterThanOrEqual(0.95);
      expect(withPlaces.changedReads).toBe(0);
    });
  }
});
