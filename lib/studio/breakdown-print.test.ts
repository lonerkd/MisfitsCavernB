import { describe, it, expect } from 'vitest';
import { breakdownDoc, type BreakdownSheetScene } from './breakdown-print';
import { printHtml } from '@/lib/print/kit';

const scene = (n: number, over: Partial<BreakdownSheetScene> = {}): BreakdownSheetScene => ({
  number: n, heading: `EXT. PIER ${n}`, kind: 'EXT · DAY', pages: '1.5', day: 2,
  boxes: [{ label: 'Cast', names: ['MAYA', 'LUIS'] }, { label: 'Props', names: ['Umbrella', 'Coat'] }], ...over,
});

describe('the printed breakdown sheets', () => {
  it('prints one sheet per scene with its facts and what it needs by category, each on its own page', () => {
    const html = printHtml(breakdownDoc({ project: 'The Pier', generated: 'd', scenes: [scene(4), scene(9)] }));
    for (const s of ['Scene 4 · EXT. PIER 4', 'Scene 9 · EXT. PIER 9', 'EXT · DAY', '1.5 pp', 'MAYA, LUIS', 'Umbrella, Coat', '<dt>Scenes</dt><dd>2</dd>']) expect(html).toContain(s);
    expect((html.match(/class="pb"/g) ?? []).length).toBe(1); // between the two, not after the last
  });
  it('says so for a scene with nothing tagged, an untitled scene, and an empty project', () => {
    const html = printHtml(breakdownDoc({ project: 'P', generated: 'd', scenes: [scene(1, { boxes: [], heading: '' })] }));
    expect(html).toContain('Scene 1 · Untitled');
    expect(html).toContain('Nothing is tagged to this scene yet.');
    expect(printHtml(breakdownDoc({ project: 'P', generated: 'd', scenes: [] }))).toContain('There are no scenes to break down yet.');
  });
});
