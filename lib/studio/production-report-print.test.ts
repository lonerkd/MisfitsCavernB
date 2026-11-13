import { describe, it, expect } from 'vitest';
import { productionReportDoc, pagesFromEighths, type ProductionReportInput } from './production-report-print';
import { printHtml } from '@/lib/print/kit';

const input = (over: Partial<ProductionReportInput> = {}): ProductionReportInput => ({
  project: 'The Pier', accent: null, day: 2, date: 'Fri 13 Mar 2026', call: '06:05', wrap: '18:40',
  scenes: [{ number: 4, heading: 'EXT. PIER - DAY', status: 'wrapped' }, { number: 9, heading: 'EXT. FERRY', status: 'planned' }], scenesDone: 1, eighths: 20,
  shots: [{ number: '4A', scene: 4, size: 'Wide', status: 'shot' }, { number: '9A', scene: 9, size: null, status: 'planned' }], shotsGot: 1, notes: 'Lost light at 17:30.', generated: '8 Nov 2026', ...over,
});

describe('the printed production report', () => {
  it('says the day, the clock, how much was shot, and lists scenes and shots', () => {
    const doc = productionReportDoc(input());
    expect(doc).toMatchObject({ kind: 'Production report', title: 'Day 2 · Fri 13 Mar 2026', subtitle: 'The Pier' });
    const html = printHtml(doc);
    for (const s of ['06:05', '18:40', '1 of 2', '2.5 pp', '1 of 2 got', 'EXT. FERRY', '4A', 'Wide', 'Lost light at 17:30.']) expect(html).toContain(s);
  });
  it('leaves out what was not logged, and says so for an empty day', () => {
    const html = printHtml(productionReportDoc(input({ call: '', wrap: '', eighths: 0, scenes: [], scenesDone: 0, shots: [], shotsGot: 0, notes: null })));
    expect(html).not.toContain('General call');
    expect(html).not.toContain('<dt>Pages</dt>');
    expect(html).toContain('Nothing was scheduled this day.');
    expect(html).toContain('No shots on the list for this day.');
    expect(html).not.toContain('>Notes<');
  });
  it('turns eighths into pages', () => { expect(pagesFromEighths(20)).toBe('2.5'); expect(pagesFromEighths(0)).toBe('0.0'); });
});
