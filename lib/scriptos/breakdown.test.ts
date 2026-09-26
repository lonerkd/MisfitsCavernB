import { describe, it, expect } from 'vitest';
import { parseScript } from './parser';
import { aggregateElements, computeBudgetLines, estimateBudgetFromScript, CAST_RATE, CREW_RATE_PER_PAGE } from './breakdown';

// Action lines written the way a 1st AD expects: production elements in CAPS.
const SCRIPT = `INT. WAREHOUSE - NIGHT

COLD BEER bottles sweat on a CRATE. A GLOCK slides across the table.

MARA
You shouldn't have come.

She shrugs off her TRENCHCOAT, revealing a BALLISTIC VEST.

They climb into a rusted FORD PICKUP.

BAM! A GUNSHOT rings out. SMOKE drifts from the muzzle.
`;

describe('script -> breakdown bridge (pure)', () => {
  const parsed = parseScript(SCRIPT);
  const scene = parsed.scenes[0];

  it('tags elements from ALL-CAPS action tokens, categorised', () => {
    expect(scene).toBeDefined();
    const el = scene!.elements!;
    expect(el.props).toEqual(expect.arrayContaining(['GLOCK', 'CRATE', 'COLD', 'BEER', 'FORD']));
    expect(el.wardrobe).toContain('TRENCHCOAT');
    expect(el.sfx).toContain('GUNSHOT');
    expect(el.vfx).toContain('SMOKE');
  });

  it('never leaks character names into the breakdown', () => {
    const el = scene!.elements!;
    for (const cat of Object.values(el)) {
      expect(cat).not.toContain('MARA');
    }
  });

  it('aggregates and synthesises a budget line per category', () => {
    const agg = aggregateElements([scene!]);
    expect(agg.props).toHaveLength(scene!.elements!.props!.length);

    const lines = computeBudgetLines(agg);
    const props = lines.find((l) => l.category.startsWith('Props ('));
    expect(props).toBeDefined();
    expect(props!.count).toBe(scene!.elements!.props!.length);
    expect(props!.amount).toBe(scene!.elements!.props!.length * 75);

    // No vehicle elements were tagged, so no Vehicles line should exist.
    expect(lines.find((l) => l.category.startsWith('Vehicles ('))).toBeUndefined();
  });

  it('handles a script with no elements gracefully', () => {
    const empty = parseScript('INT. ROOM - DAY\n\nA man sits. Nothing in caps.\n');
    const el = empty.scenes[0].elements!;
    expect(el.props).toHaveLength(0);
    expect(computeBudgetLines(aggregateElements([{ elements: el }]))).toHaveLength(0);
  });
});

describe('estimateBudgetFromScript', () => {
  it('prices cast, tagged elements and camera & crew by page count', () => {
    expect(estimateBudgetFromScript(parseScript(SCRIPT))).toEqual([
      { category: 'Cast (1 role)', amount: CAST_RATE },
      { category: 'Props (9 items)', amount: 9 * 75 },
      { category: 'Wardrobe (1 item)', amount: 120 },
      { category: 'Special FX (1)', amount: 300 },
      { category: 'Visual FX (1)', amount: 500 },
      { category: 'Camera & Crew (1 pg)', amount: CREW_RATE_PER_PAGE },
    ]);
  });

  it('bills at least one page and skips cast when there are no speaking roles', () => {
    expect(estimateBudgetFromScript({ scenes: [] })).toEqual([{ category: 'Camera & Crew (1 pg)', amount: CREW_RATE_PER_PAGE }]);
    expect(estimateBudgetFromScript({ characters: [], scenes: [{ eighths: 20 }] })).toEqual([{ category: 'Camera & Crew (3 pg)', amount: 3 * CREW_RATE_PER_PAGE }]);
  });
});
