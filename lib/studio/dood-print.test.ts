import { describe, it, expect } from 'vitest';
import { doodDoc } from './dood-print';
import { printHtml } from '@/lib/print/kit';

describe('the printed day out of days', () => {
  it('has a column per shoot day, the S / W / H / F code in each cell, the days worked and a legend, in landscape', () => {
    const doc = doodDoc({ project: 'The Pier', generated: 'd', days: [1, 2, 4], rows: [{ name: 'MAYA', cells: ['S', 'W', 'F'], worked: 3 }, { name: 'LUIS', cells: ['SF', '', ''], worked: 1 }] });
    expect(doc.orientation).toBe('landscape');
    const html = printHtml(doc);
    for (const s of ['<th class="center" style="width:5%">D1</th>', '<th class="center" style="width:5%">D4</th>', 'MAYA', '<td class="center">S</td>', '<td class="center">F</td>', '<td class="center">SF</td>', 'S start · W work · H hold']) expect(html).toContain(s);
    expect(html).toContain('<td class="center"></td>'); // LUIS is not on days 2 and 4
  });
  it('says so when nobody is scheduled', () => {
    expect(printHtml(doodDoc({ project: 'P', generated: 'd', days: [], rows: [] }))).toContain('Nobody is scheduled yet.');
  });
});
