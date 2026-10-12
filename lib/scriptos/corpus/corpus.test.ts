import { describe, expect, it } from 'vitest';
import { generateScript, INTERNATIONAL, PLAIN, REAL_WORLD, rng, STRESS, type Style } from './generate';
import { renderPdfPages, renderText } from './render';
import { pool, scoreBlocks, scoreLines, structureScore, TYPES } from './score';
import { measurePdf, measureText, type Result } from './run';

describe('the generator', () => {
  it('is deterministic: the same seed is the same script', () => {
    expect(generateScript(42)).toEqual(generateScript(42));
    expect(generateScript(42)).not.toEqual(generateScript(43));
    const a = rng(7);
    const b = rng(7);
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
  });

  it('writes a well-formed script: every speech is a cue then dialogue, parentheticals sit inside speeches', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const els = generateScript(seed, REAL_WORLD);
      els.forEach((el, i) => {
        if (el.type === 'character') expect(els[i + 1]?.type === 'dialogue' || els[i + 1]?.type === 'parenthetical').toBe(true);
        if (el.type === 'dialogue' || el.type === 'parenthetical') expect(el.group).not.toBeNull();
        if (el.type === 'slug') expect(el.group).toBeNull();
      });
      expect(els.filter((e) => e.type === 'slug')).toHaveLength(REAL_WORLD.scenes);
    }
  });

  it('sets the traps it is told to, and none when it is told not to', () => {
    const plain = generateScript(11, PLAIN).map((e) => e.text).join('\n');
    expect(plain).not.toMatch(/MARY-ANN|JOSÉ|Interior lights|THE DOOR EXPLODES/);
    const hard = Array.from({ length: 12 }, (_, i) => generateScript(i, INTERNATIONAL).map((e) => e.text).join('\n')).join('\n');
    expect(hard).toMatch(/MARY-ANN|JOSÉ|ÉLISE|O'BRIEN|JEAN-LUC|BJÖRK|D'ARCY|ZOË/);
    expect(hard).toMatch(/[Ѐ-ӿ一-鿿؀-ۿ֐-׿]/); // Cyrillic, CJK, Arabic or Hebrew
  });
});

describe('the renderers', () => {
  it('text: a blank line between elements and none inside a speech, and the truth lines match the text', () => {
    const els = generateScript(5, REAL_WORLD);
    const { text, truth } = renderText(els);
    const lines = text.replace(/\n$/, '').split('\n');
    expect(lines).toHaveLength(truth.length);
    truth.forEach((t, i) => expect(lines[i]).toBe(t.text));
  });

  it('pdf: positions follow the screenplay layout, wrapped lines stay in their column, page numbers start on page 2', () => {
    const pages = renderPdfPages(generateScript(5, REAL_WORLD));
    expect(pages.length).toBeGreaterThan(1);
    const xs = new Set(pages.flat().map((i) => i.transform[4]));
    for (const x of xs) expect([108, 180, 223, 252, 396, 540]).toContain(x);
    expect(pages[0].some((i) => i.transform[4] === 540)).toBe(false);
    expect(pages[1].some((i) => i.str === '2.' && i.transform[4] === 540)).toBe(true);
  });
});

describe('the scorer', () => {
  const els = generateScript(9, REAL_WORLD);
  const { truth } = renderText(els);

  it('a perfect read scores 1, a wrong one less, line for line', () => {
    const perfect = truth.map((t) => ({ type: t.type, text: t.text }));
    const s = scoreLines(truth, perfect);
    expect(s.accuracy).toBe(1);
    expect(s.macroF1).toBe(1);
    const broken = perfect.map((l) => (l.type === 'dialogue' ? { ...l, type: 'action' } : l));
    const b = scoreLines(truth, broken);
    expect(b.accuracy).toBeLessThan(1);
    expect(b.perType.dialogue.recall).toBe(0);
    expect(b.perType.action.precision).toBeLessThan(1);
  });

  it('block for block: reflowed or merged text is matched by what it says, and a swallowed element is a miss', () => {
    const read = truth.filter((t) => t.type !== 'empty').map((t) => ({ type: t.type as string, text: t.text }));
    expect(scoreBlocks(truth, read).accuracy).toBe(1);
    const i = read.findIndex((l) => l.type === 'character');
    const swallowed = read.filter((_, k) => k !== i).map((l, k) => (k === i - 1 ? { ...l, text: l.text + ' ' + read[i].text } : l));
    const s = scoreBlocks(truth, swallowed);
    expect(s.perType.character.fn).toBeGreaterThan(0);
    expect(s.accuracy).toBeLessThan(1);
  });

  it('structure: scenes and cast found, and cast invented', () => {
    const cast = [...new Set(truth.filter((t) => t.type === 'character').map((t) => t.text.replace(/\s*\([^)]*\)/g, '').trim()))];
    const slugs = truth.filter((t) => t.type === 'slug').length;
    expect(structureScore(truth, { scenes: slugs, cast })).toMatchObject({ sceneExact: true, castRecall: 1, castInvented: 0 });
    expect(structureScore(truth, { scenes: slugs + 1, cast: [...cast, 'GHOST'] })).toMatchObject({ sceneExact: false, castInvented: 1 });
  });

  it('pooling sums counts across scripts', () => {
    const a = scoreLines(truth, truth.map((t) => ({ type: t.type })));
    const p = pool([a, a]);
    expect(p.total).toBe(a.total * 2);
    for (const t of TYPES) expect(p.perType[t].tp).toBe(a.perType[t].tp * 2);
  });
});

// ── The ratchet ─────────────────────────────────────────────────────────────
// The reading pipeline measured on the seeded corpus, by surface and by style.
// A floor may be RAISED when the brain improves — never lowered to make a
// build pass (the coverage rule). If the generator changes, every number
// moves: re-measure all of them in the same change and say so.
//   BRAIN_REPORT=1 npx vitest run lib/scriptos/corpus   prints the full matrix.
const STYLES: Array<[string, Style]> = [['PLAIN', PLAIN], ['REAL_WORLD', REAL_WORLD], ['INTERNATIONAL', INTERNATIONAL], ...Object.entries(STRESS)];

/** Macro-F1 floors: [text, pdf]. Measured 2026-10-12 on 30 seeded scripts per cell; text floors raised after B3 (the evidence layer), PDF floors after B6 (the layout reader). */
const FLOORS: Record<string, [number, number]> = {
  PLAIN: [0.93, 0.93],
  REAL_WORLD: [0.91, 0.91],
  INTERNATIONAL: [0.91, 0.91],
  dotNumbers: [0.93, 0.93],
  letterNumbers: [0.93, 0.93],
  periodTransitions: [0.93, 0.93],
  bareTransitions: [0.93, 0.93],
  shouting: [0.87, 0.87],
  oddNames: [0.93, 0.93],
  nonLatin: [0.93, 0.93],
  extensions: [0.94, 0.94],
  traps: [0.93, 0.93],
  parentheticals: [0.93, 0.93],
};

describe('the reading pipeline on the corpus', () => {
  const measured = new Map<string, { text: Result; pdf: Result }>();
  for (const [name, style] of STYLES) measured.set(name, { text: measureText(style), pdf: measurePdf(style) });

  it('prints the matrix when asked', () => {
    if (!process.env.BRAIN_REPORT) return;
    const rows = STYLES.map(([n]) => {
      const m = measured.get(n)!;
      const f = (r: Result) => `F1 ${r.score.macroF1.toFixed(3)}  acc ${(r.score.accuracy * 100).toFixed(1).padStart(5)}%  scenes ${(r.sceneExact * 100).toFixed(0).padStart(3)}%  cast ${(r.castRecall * 100).toFixed(0).padStart(3)}%`;
      return `${n.padEnd(18)} text ${f(m.text)}   |   pdf ${f(m.pdf)}`;
    });
    console.log('\nBRAIN MATRIX\n' + rows.join('\n'));
  });

  for (const [name] of STYLES) {
    it(`${name}: does not read worse than the floor`, () => {
      const floor = FLOORS[name];
      if (!floor) return; // not yet set
      const m = measured.get(name)!;
      expect(m.text.score.macroF1).toBeGreaterThanOrEqual(floor[0]);
      expect(m.pdf.score.macroF1).toBeGreaterThanOrEqual(floor[1]);
    });
  }
});
