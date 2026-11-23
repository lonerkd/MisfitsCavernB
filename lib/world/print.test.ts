import { describe, it, expect } from 'vitest';
import { worldNotesDoc } from './print';
import { printHtml } from '@/lib/print/kit';
import { hasTable, docToCsv } from '@/lib/print/csv';
import { emptyWorld, type World } from './world';

const w: World = {
  projectId: 'p', locations: [{ id: 'l', name: 'The Pier', description: 'Fog <b>always</b>', mood: 'cold', lat: 38.7, lng: -9.1 }],
  lore: [{ id: 'o', title: 'The Tide Pact', body: 'Fishers never sail at dusk' }], rules: [{ id: 'r', rule: 'No magic after dark' }],
  timeline: [{ id: 't', when: '1890', what: 'The pier is built' }],
};

describe('the printed world notes', () => {
  it('lists places, lore, rules and the timeline, escaping what a person typed', () => {
    const html = printHtml(worldNotesDoc({ world: w, project: 'The Pier', generated: 'd' }));
    for (const s of ['World notes', 'The Pier', 'The Tide Pact', 'No magic after dark', '1890', 'The pier is built', '38.7']) expect(html).toContain(s);
    expect(html).not.toContain('<b>always</b>');
  });
  it('says so when empty and still has tables for the CSV', () => {
    const doc = worldNotesDoc({ world: emptyWorld('p'), generated: 'd' });
    expect(printHtml(doc)).toContain('No places yet.');
    expect(hasTable(worldNotesDoc({ world: w, generated: 'd' }))).toBe(true);
    expect(docToCsv(worldNotesDoc({ world: w, generated: 'd' }))).toContain('No magic after dark');
  });
});
