import { describe, it, expect } from 'vitest';
import { worldBibleDoc, type WorldPrintLocation } from './world-print';
import { printHtml } from '@/lib/print/kit';
import { hasTable } from '@/lib/print/csv';

const dock: WorldPrintLocation = {
  name: 'DOCK OFFICE', address: '1 Quay Rd', contact: 'Rui 912', status: 'Confirmed', permit: 'Permit needed', cost: 500, notes: 'Park <b>behind</b>.',
  appearances: [{ number: 2, heading: 'INT. DOCK OFFICE - NIGHT', intExt: 'INT', time: 'night', storyDay: 1, shootDay: 3, shootDate: '2026-11-25', pages: '3/8' }],
  days: [3], pages: '3/8', warnings: ['DOCK OFFICE shoots in 3 days and its permit is still needed.'],
};
const orphan: WorldPrintLocation = { name: 'OLD CANNERY', address: null, contact: null, status: 'Scouting', permit: 'Permit: not checked', cost: null, notes: null, appearances: [], days: [], pages: null, warnings: [] };
const base = { project: 'The Pier', generated: 'd', format: (n: number) => `$${n}` };

describe('the printed world bible', () => {
  it('has an overview, then a section for each place with its record, where it appears and its warnings', () => {
    const html = printHtml(worldBibleDoc({ ...base, locations: [dock, orphan] }));
    for (const s of ['World bible', 'DOCK OFFICE', '1 Quay Rd', 'Rui 912', '$500', 'Where it appears', 'INT. DOCK OFFICE - NIGHT', '2026-11-25', 'Worth a look', 'permit is still needed', 'not in the script yet', 'Not in the script yet: no scene is set here.', '<dt>Locations</dt><dd>2</dd>']) expect(html).toContain(s);
    expect(html).not.toContain('<b>behind</b>');
  });
  it('says so when there are no locations, and has a table for the CSV button', () => {
    expect(printHtml(worldBibleDoc({ ...base, locations: [] }))).toContain('No locations yet.');
    expect(hasTable(worldBibleDoc({ ...base, locations: [dock] }))).toBe(true);
  });
});
