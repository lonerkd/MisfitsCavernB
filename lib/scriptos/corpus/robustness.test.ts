import { describe, expect, it } from 'vitest';
import { INTERNATIONAL, PLAIN, REAL_WORLD } from './generate';
import { stability, TRANSFORMS } from './metamorphic';
import { measurePdf } from './run';

// B1 of the deep-brain plan: make the measure hard to fool.
//   BRAIN_REPORT=1 npx vitest run lib/scriptos/corpus/robustness   prints the numbers.
// Floors may be raised, never lowered. Measured 2026-10-12.

const STYLES = [['PLAIN', PLAIN], ['REAL_WORLD', REAL_WORLD], ['INTERNATIONAL', INTERNATIONAL]] as const;

describe('metamorphic stability: an equivalent rewrite must not change the read', () => {
  // [style][transform] → floor (share of elements whose type is unchanged).
  // An equivalent rewrite must change nothing: every floor is 1.
  const FLOORS: Record<string, Record<string, number>> = Object.fromEntries(STYLES.map(([n]) => [n, Object.fromEntries(Object.keys(TRANSFORMS).map((t) => [t, 1]))]));
  const measured: Record<string, Record<string, number>> = {};
  for (const [name, style] of STYLES) {
    measured[name] = {};
    for (const [t, fn] of Object.entries(TRANSFORMS)) measured[name][t] = stability(style, fn);
  }

  it('prints the numbers when asked', () => {
    if (!process.env.BRAIN_REPORT) return;
    const rows = Object.entries(measured).map(([n, m]) => `${n.padEnd(14)} ${Object.entries(m).map(([t, v]) => `${t} ${v.toFixed(3)}`).join('  ')}`);
    console.log('\nBRAIN STABILITY\n' + rows.join('\n'));
  });

  for (const [name] of STYLES) {
    for (const t of Object.keys(TRANSFORMS)) {
      it(`${name} · ${t}: does not fall below its floor`, () => {
        const floor = FLOORS[name]?.[t];
        if (floor === undefined) return;
        expect(measured[name][t]).toBeGreaterThanOrEqual(floor);
      });
    }
  }
});

describe('PDF layout: the same script on a different page', () => {
  // The importer hard-codes where a character cue may sit (x 180–350 points),
  // for US-Letter and a 1.5 in left margin. A 1 in margin moves everything 36 points
  // left, A4 centred about 8, a 2 in margin 36 right.
  const LAYOUTS: Array<[string, { shift?: number; scale?: number }]> = [
    ['margin -72', { shift: -72 }], ['margin -36', { shift: -36 }], ['A4 -8', { shift: -8 }], ['standard', {}], ['margin +18', { shift: 18 }], ['margin +36', { shift: 36 }],
    ['scale 0.85', { scale: 0.85 }], ['scale 0.9', { scale: 0.9 }], ['scale 1.1', { scale: 1.1 }], ['scale 1.2', { scale: 1.2 }],
  ];
  // Measured 2026-10-12 on REAL_WORLD, 30 seeded scripts per layout; raised after B6 (the layout reader learns the page's own columns).
  const FLOORS: Record<string, number> = {
    'margin -72': 0.91, 'margin -36': 0.91, 'A4 -8': 0.91, standard: 0.91, 'margin +18': 0.91, 'margin +36': 0.91,
    'scale 0.85': 0.91, 'scale 0.9': 0.91, 'scale 1.1': 0.91, 'scale 1.2': 0.91,
  };
  const measured: Record<string, number> = {};
  for (const [name, layout] of LAYOUTS) measured[name] = measurePdf(REAL_WORLD, undefined, layout).score.macroF1;

  it('prints the numbers when asked', () => {
    if (!process.env.BRAIN_REPORT) return;
    console.log('\nBRAIN PDF LAYOUT (REAL_WORLD, macro-F1)\n' + LAYOUTS.map(([n]) => `${n.padEnd(12)} ${measured[n].toFixed(3)}`).join('\n'));
  });

  for (const [name] of LAYOUTS) {
    it(`${name}: does not fall below its floor`, () => {
      const floor = FLOORS[name];
      if (floor === undefined) return;
      expect(measured[name]).toBeGreaterThanOrEqual(floor);
    });
  }
});
