import { describe, it, expect } from 'vitest';
import { pitchDoc, type PitchPrintInput } from './pitch-print';
import { printHtml } from '@/lib/print/kit';

const input = (over: Partial<PitchPrintInput> = {}): PitchPrintInput => ({
  title: 'The Pier', accent: null, logline: 'A ferry, a tide, a missing coat.', generated: 'd',
  concepts: [{ url: 'https://x.test/a.jpg', title: 'Dawn' }, { url: 'http://insecure.test/b.jpg', title: 'Bad' }, { url: 'https://x.test/c.jpg', title: null }],
  characters: ['MAYA', 'LUIS'], beats: ['Inciting incident', 'Midpoint'], ...over,
});

describe('the printed pitch', () => {
  it('prints the title, the logline, the images, the characters and the beats', () => {
    const html = printHtml(pitchDoc(input()));
    for (const s of ['<h1>The Pier</h1>', 'A ferry, a tide, a missing coat.', 'src="https://x.test/a.jpg"', '<figcaption>Dawn</figcaption>', 'MAYA', 'Inciting incident', 'The visual world', 'Story engine']) expect(html).toContain(s);
    expect(html).not.toContain('insecure.test'); // only https images are printed
  });
  it('says so for each part that is empty, and caps a long beat list with a note', () => {
    const html = printHtml(pitchDoc(input({ logline: null, concepts: [], characters: [], beats: Array.from({ length: 14 }, (_, i) => `Beat ${i}`) })));
    expect(html).toContain('No concept references yet.');
    expect(html).toContain('No characters yet.');
    expect(html).toContain('2 more beats in the project.');
    expect(printHtml(pitchDoc(input({ beats: [] })))).toContain('No story beats yet.');
  });
});
