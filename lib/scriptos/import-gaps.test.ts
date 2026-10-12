import { describe, expect, it, vi } from 'vitest';

// Where importing a script is wrong TODAY (BACKLOG 3.20), found by comparing the
// current import with the old import modal's "surgical stitcher" — which the
// current lib/scriptos/pdfImport.ts is a typed port of (same algorithm, same
// coordinates). Each gap is an `it.fails`: it passes while the gap exists and
// FAILS once it is fixed — then change it to `it`. The `it` cases pin what
// works. The PDF text is mocked at standard US-Letter screenplay positions
// (points): action and headings x=108, dialogue x=180, parenthetical x=223,
// character x=252, transition x=396.

type Item = { str: string; transform: number[] };
const at = (str: string, x: number, y: number): Item => ({ str, transform: [12, 0, 0, 12, x, y] });
const page = (rows: Array<[string, number]>): Item[] => rows.map(([s, x], i) => at(s, x, 700 - i * 12));

const pages = vi.hoisted(() => ({ current: [] as Item[][] }));
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({
    promise: Promise.resolve({
      get numPages() { return pages.current.length; },
      getPage: async (n: number) => ({ getTextContent: async () => ({ items: pages.current[n - 1] }) }),
    }),
  }),
}));

import { extractTextFromPdf } from './pdfImport';
import { normalizeScreenplay } from './normalize';
import { importToContent } from './import';
import { parseScript } from './parser';

/** What the editor ends up with for a PDF: stitched, normalised, then parsed. */
async function importPdf(...doc: Array<Array<[string, number]>>) {
  pages.current = doc.map(page);
  const raw = await extractTextFromPdf({ arrayBuffer: async () => new ArrayBuffer(0) } as unknown as File);
  const content = normalizeScreenplay(raw) || raw;
  return { raw, content, lines: parseScript(content).lines.filter((l) => l.type !== 'empty') };
}
const typesOf = (lines: Array<{ type: string }>) => lines.map((l) => l.type);

describe('PDF import — what works', () => {
  it('joins wrapped lines into one paragraph, drops page numbers and (CONTINUED), keeps heading, cue, dialogue and transition apart', async () => {
    const { lines, content } = await importPdf(
      [['1.', 540], ['INT. KITCHEN - NIGHT', 108], ['Maya pours coffee. The kettle screams and the', 108], ['window rattles.', 108],
        ['MAYA', 252], ['You\'re late. I waited up for', 180], ['you all night.', 180], ['CUT TO:', 396]],
      [['2.', 540], ['(CONTINUED)', 108], ['EXT. PIER - DAY', 108], ['Boats come in.', 108]],
    );
    expect(typesOf(lines)).toEqual(['slug', 'action', 'character', 'dialogue', 'transition', 'slug', 'action']);
    expect(content).toContain('Maya pours coffee. The kettle screams and the window rattles.');
    expect(content).not.toMatch(/^\d+\.$/m);
    expect(content).not.toContain('CONTINUED');
  });
});

describe('KNOWN GAPS in PDF import', () => {
  it.fails('a hyphenated or accented character name is a cue, not swallowed into the line before it (MARY-ANN, JOSÉ)', async () => {
    const { lines } = await importPdf([['EXT. PIER - DAY', 108], ['Boats come in.', 108], ['MARY-ANN', 252], ['Hello, sailor.', 180], ['JOSÉ', 252], ['Hola.', 180]]);
    expect(typesOf(lines)).toEqual(['slug', 'action', 'character', 'dialogue', 'character', 'dialogue']);
  });

  it.fails('FADE OUT. (with a full stop) ends the script as a transition, not inside the last speech', async () => {
    const { lines } = await importPdf([['INT. ROOM - DAY', 108], ['MAYA', 252], ['Goodbye.', 180], ['FADE OUT.', 396]]);
    expect(typesOf(lines)).toEqual(['slug', 'character', 'dialogue', 'transition']);
  });

  it.fails('a parenthetical stays a parenthetical (it is not glued onto the dialogue)', async () => {
    const { lines } = await importPdf([['INT. ROOM - DAY', 108], ['MAYA', 252], ['(quietly)', 223], ['You\'re late.', 180]]);
    expect(typesOf(lines)).toEqual(['slug', 'character', 'parenthetical', 'dialogue']);
  });

  it.fails('a cue with an extension (LEO (O.S.)) keeps its dialogue', async () => {
    const { lines } = await importPdf([['INT. ROOM - DAY', 108], ['LEO (O.S.)', 252], ['Traffic.', 180]]);
    expect(typesOf(lines)).toEqual(['slug', 'character', 'dialogue']);
  });

  it.fails('shouted dialogue ("STOP!", "NO.") is dialogue, and a short caps speech is not mistaken for a cue', async () => {
    const { lines } = await importPdf([['INT. ROOM - DAY', 108], ['MAYA', 252], ['STOP!', 180], ['NO.', 180.4]]);
    expect(typesOf(lines)).toEqual(['slug', 'character', 'dialogue', 'dialogue']);
  });
});

describe('Fountain import', () => {
  const SRC = 'Title: Harbor\nAuthor: Ana\n\n.SNIPER SCOPE\n\n= Maya arrives\n\n# ACT ONE\n\n@mc\nHello.\n\nINT. ROOM - DAY\n\nText.\n';

  it('keeps the plain screenplay elements and the notes', () => {
    const { content } = importToContent(SRC + '\n[[remember to cut]]\n', 'x.fountain');
    expect(content).toContain('INT. ROOM - DAY');
    expect(content).toContain('[[remember to cut]]');
  });

  it.fails('keeps a forced scene heading (.SNIPER SCOPE) as a scene heading', () => {
    const { content } = importToContent(SRC, 'x.fountain');
    expect(parseScript(content).lines.some((l) => l.type === 'slug' && /SNIPER SCOPE/.test(l.text))).toBe(true);
  });

  it.fails('keeps the title page (Title:, Author:)', () => {
    expect(importToContent(SRC, 'x.fountain').content).toContain('Title: Harbor');
  });

  it.fails('keeps sections and synopses (# ACT ONE, = Maya arrives)', () => {
    const { content } = importToContent(SRC, 'x.fountain');
    expect(content).toContain('# ACT ONE');
    expect(content).toContain('= Maya arrives');
  });

  it.fails('keeps a forced character name as written (@mc is not upper-cased)', () => {
    expect(importToContent(SRC, 'x.fountain').content).toContain('@mc');
  });
});
