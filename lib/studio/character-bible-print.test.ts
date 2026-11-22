import { describe, it, expect } from 'vitest';
import { characterBibleDoc, type BiblePrintCharacter } from './character-bible-print';
import { printHtml } from '@/lib/print/kit';
import { hasTable } from '@/lib/print/csv';

const maya: BiblePrintCharacter = { name: 'MAYA', fullName: 'Maya Okafor', age: '30s', description: 'A ferry pilot.', backstory: 'Left home at sixteen.', motivation: 'To bring the ferry home.', arc: 'Learns to stay', notes: 'Never <b>cries</b>.', scenes: 12, lines: 40, talksTo: [{ name: 'LUIS', strength: 19 }], warnings: ['MAYAH and MAYA look like one character spelled two ways.'] };
const luis: BiblePrintCharacter = { name: 'LUIS', scenes: 9, lines: 22, talksTo: [{ name: 'MAYA', strength: 19 }], warnings: [] };
const base = { project: 'The Pier', script: 'Draft 2', generated: 'd' };

describe('the printed character bible', () => {
  it('has an overview, then a page for each main character with the bible fields, counts, who they talk to and their warnings', () => {
    const html = printHtml(characterBibleDoc({ ...base, characters: [maya, luis] }));
    for (const s of ['Character bible', 'Draft 2', 'Maya Okafor', 'A ferry pilot.', 'Left home at sixteen.', 'To bring the ferry home.', 'Learns to stay', 'LUIS (19)', 'Worth a look', 'spelled two ways', '<dt>Characters</dt><dd>2</dd>']) expect(html).toContain(s);
    expect(html).not.toContain('<b>cries</b>');
    expect(html).toContain('Nothing written in the bible for this character yet.');
  });
  it('gives pages only to the main characters and says so when there are none', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ ...luis, name: `C${i}` }));
    const doc = characterBibleDoc({ ...base, characters: many, mainCount: 2 });
    expect(doc.blocks.filter((b) => b.type === 'section')).toHaveLength(2);
    expect(printHtml(characterBibleDoc({ ...base, characters: [] }))).toContain('No characters yet.');
  });
  it('has a table, so the CSV button has something to save', () => {
    expect(hasTable(characterBibleDoc({ ...base, characters: [maya] }))).toBe(true);
  });
});
