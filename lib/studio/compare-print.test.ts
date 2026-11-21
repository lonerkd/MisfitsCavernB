import { describe, it, expect } from 'vitest';
import { compareDoc } from './compare-print';
import { compareScripts } from '@/lib/scriptos/compare';
import { printHtml } from '@/lib/print/kit';
import { hasTable } from '@/lib/print/csv';

const A = 'INT. KITCHEN - DAY\n\nMaya pours coffee.\n\nMAYA\nGood morning.\n\nEXT. STREET - NIGHT\n\nRain.\n\nLEO\nHey.\n';
const base = { project: 'The Pier', script: 'Pilot', fromLabel: 'Blue Revision', toLabel: 'Current draft', generated: 'd' };

describe('the printed change report', () => {
  it('opens with the numbers, then lists each changed scene with before and after', () => {
    const B = A.replace('Good morning.', 'Good evening, <b>Maya</b>.') + '\nINT. ATTIC - NIGHT\n\nDust.\n';
    const html = printHtml(compareDoc({ ...base, comparison: compareScripts(A, B) }));
    for (const s of ['Script change report', '<dt>Scenes added</dt><dd>1</dd>', '<dt>Scenes changed</dt><dd>1</dd>', 'INT. KITCHEN - DAY — changed', 'INT. ATTIC - NIGHT — added', 'Good morning.', 'Blue Revision', 'Current draft']) expect(html).toContain(s);
    expect(html).not.toContain('<b>Maya</b>'); // escaped, never raw markup
    expect(html).not.toContain('EXT. STREET - NIGHT'); // unchanged scenes are not listed
  });

  it('names renames, and says so when nothing differs', () => {
    const renamed = compareScripts(A, A.replace(/MAYA/g, 'MIA').replace(/Maya/g, 'Mia'));
    const html = printHtml(compareDoc({ ...base, comparison: renamed }));
    expect(html).toContain('MAYA became MIA');
    expect(html).toContain('Nothing else differs.');
    expect(printHtml(compareDoc({ ...base, comparison: compareScripts(A, A) }))).toContain('The two versions are the same.');
  });

  it('lists only what the filter shows, and has a table for the CSV when something changed', () => {
    const cmp = compareScripts(A, A.replace('Rain.', 'Snow.').replace('Hey.', 'Hello.'));
    const doc = compareDoc({ ...base, comparison: cmp, filter: 'dialogue' });
    const html = printHtml(doc);
    expect(html).toContain('Dialogue only');
    expect(html).toContain('Hello.');
    expect(html).not.toContain('Snow.');
    expect(hasTable(doc)).toBe(true);
  });
});
