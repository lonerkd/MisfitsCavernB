import { describe, it, expect, vi } from 'vitest';
import { parseScript } from './parser';
import { exportScriptAsFdx } from './export';
import { importToContent } from './import';

/**
 * Runs the real FDX exporter. It builds the XML and hands it to a download link,
 * so the Blob is captured here instead of saved.
 */
async function exportFdx(content: string, title: string): Promise<string> {
  const sink: { blob: Blob | null } = { blob: null };
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  vi.stubGlobal('document', {
    createElement: () => ({ click: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {} },
  });
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    sink.blob = blob as Blob;
    return 'blob:fdx-roundtrip';
  };
  URL.revokeObjectURL = () => {};
  try {
    exportScriptAsFdx({ id: 'fdx-roundtrip', title, content, format: 'screenplay', createdAt: '', updatedAt: '' });
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    vi.unstubAllGlobals();
  }
  if (!sink.blob) throw new Error('exportScriptAsFdx produced no Blob');
  return sink.blob.text();
}

/**
 * The element type and trimmed text of every non-empty line. Blank lines are
 * layout only: an FDX file has no empty paragraphs, so they are not compared.
 */
function signature(text: string): string[] {
  return parseScript(text).lines
    .filter((l) => l.type !== 'empty')
    .map((l) => `${l.type}|${l.text.trim()}`);
}

/**
 * The importer reads every <Paragraph> in the file, including the TitlePage
 * header and content, as body text (fixed: parseFdx skips it). The
 * per-script cases therefore drop the TitlePage element before importing, so
 * that each case measures the body. The title page itself is still exported
 * as body paragraphs and is still compared.
 */
function withoutTitlePage(xml: string): string {
  return xml.replace(/<TitlePage>[\s\S]*?<\/TitlePage>/, '');
}

async function roundTrip(fountain: string): Promise<{ before: string[]; after: string[] }> {
  const before = signature(fountain);
  const xml = await exportFdx(fountain, 'Round Trip');
  const { content } = importToContent(withoutTitlePage(xml), 'round-trip.fdx');
  return { before, after: signature(content) };
}

const CASES: Array<{ name: string; fountain: string }> = [
  {
    name: 'basic screenplay: scene numbers, action, speech, parenthetical, transitions',
    fountain: `Title: Basic
Author: Sam

FADE IN:

INT. HOUSE - DAY #1#

A room. Dust.

BRICK
Are they cold?

BRICK
(quietly)
Not yet.

CUT TO:

EXT. POOL - NIGHT #2A#

Water.
`,
  },
  {
    name: 'character extensions (V.O.), (CONT\'D) and (O.S.) in upper case',
    fountain: `INT. KITCHEN - DAY

BRICK (V.O.)
I remember.

BRICK (CONT'D)
And then.

STEEL (O.S.)
Hello.
`,
  },
  {
    name: 'dual dialogue: caret after the name, and a caret on its own line',
    fountain: `INT. BAR - NIGHT

BRICK
Hi.

STEEL ^
Hey.

STEEL
Screw retirement.
^
BRICK
Screw retirement.
`,
  },
  {
    name: 'title page with credit, author and draft date',
    fountain: `Title: My Film
Credit: Written by
Author: Sam
Draft date: 1 Jan

FADE IN:

INT. A - DAY

Body.
`,
  },
  {
    name: 'non-Latin scene heading, character names and dialogue',
    fountain: `EXT. МОСКВА - УТРО

ИВАН
Привет, мир.

田中
こんにちは。
`,
  },
  {
    name: 'empty lines before, between and inside a scene; multi-line action and speech',
    fountain: `INT. A - DAY



A room.
Dust on everything.

BRICK
(quietly)
Line one.
Line two.


The end.
`,
  },
  {
    name: 'forced action (!), forced character (@), centered text (> <) and forced transition (>)',
    fountain: `!THIS IS A FORCED ACTION LINE.

@MAYA
Forced character line.

> THE END <

> BURN TO PINK.
`,
  },
  {
    name: 'special characters: ampersand, angle brackets, quotes, and an entity-like string',
    fountain: `INT. A & B - DAY

BRICK & STEEL <3 "quotes" 'apos' a > b.

STEEL
It's <b>bold</b> & &amp; ok.
`,
  },
];

describe('FDX round trip keeps the type and text of every line', () => {
  for (const c of CASES) {
    it(c.name, async () => {
      const { before, after } = await roundTrip(c.fountain);
      expect(before.length).toBeGreaterThan(0);
      expect(after).toEqual(before);
    });
  }
});

// Former losses, fixed 2026-11-21; each is now a guard.
describe('FDX round trip: losses that stay fixed', () => {
  it('loses the case of a character extension typed in lower case: blocks.ts renderBlockText upper-cases the whole cue', async () => {
    const { after } = await roundTrip(`INT. A - DAY

STEEL (beer raised)
To retirement.
`);
    expect(after).toContain('character|STEEL (beer raised)');
  });

  it('loses the case of a forced scene heading (.Rooftop): blocks.ts renderBlockText upper-cases every scene', async () => {
    const { after } = await roundTrip(`INT. A - DAY

.Rooftop at dusk

Body.
`);
    expect(after).toContain('slug|.Rooftop at dusk');
  });

  it('loses runs of inner spaces in action: import.ts parseFdx collapses every whitespace run to one space', async () => {
    const { after } = await roundTrip(`INT. A - DAY

A   room  with   gaps.
`);
    expect(after).toContain('action|A   room  with   gaps.');
  });

  it('adds two action lines that repeat the title on every full import: import.ts parseFdx reads the export.ts TitlePage paragraphs as body', async () => {
    const fountain = `Title: My Film

INT. A - DAY

Body.
`;
    const xml = await exportFdx(fountain, 'My Film');
    const { content } = importToContent(xml, 'full.fdx');
    expect(signature(content)).toEqual(signature(fountain));
  });
});
