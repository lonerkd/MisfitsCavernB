import { describe, it, expect } from 'vitest';
import { castingSheetDoc, type CastingPrintRole } from './casting-print';
import { printHtml } from '@/lib/print/kit';
import { hasTable } from '@/lib/print/csv';

const maya: CastingPrintRole = {
  character: 'MAYA', cast: 'ana',
  candidates: [{ name: 'Ana Reyes', status: 'Callback', reel: 'https://example.com/reel', note: 'Strong <b>tape</b>' }, { name: 'Bo Lin', status: 'Passed', reel: null, note: null }],
  notes: ['Try a softer read'],
};
const open: CastingPrintRole = { character: 'JUDE', cast: null, candidates: [], notes: [] };
const base = { project: 'The Pier', generated: 'd' };

describe('the printed casting sheet', () => {
  it('has an overview, then a section per role with its candidates and notes', () => {
    const html = printHtml(castingSheetDoc({ ...base, roles: [maya, open] }));
    for (const s of ['Casting sheet', 'MAYA', 'JUDE', 'Ana Reyes', 'Callback', 'https://example.com/reel', 'Try a softer read', 'open', '<dt>Roles</dt><dd>2</dd>', '<dt>Cast</dt><dd>1</dd>']) expect(html).toContain(s);
  });
  it('prints markup in a note as text', () => {
    expect(printHtml(castingSheetDoc({ ...base, roles: [maya] }))).not.toContain('<b>tape</b>');
  });
  it('says so with no roles, and has a table for the CSV button', () => {
    expect(printHtml(castingSheetDoc({ ...base, roles: [] }))).toContain('No roles yet.');
    expect(hasTable(castingSheetDoc({ ...base, roles: [maya] }))).toBe(true);
  });
});
