// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { parseScript } from './parser';
import { exportScriptAsFdx, scriptToFdx } from './export';

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

async function roundTrip(fountain: string): Promise<{ before: string[]; after: string[] }> {
  const before = signature(fountain);
  const xml = await exportFdx(fountain, 'Round Trip');
  const { content } = importToContent(xml, 'round-trip.fdx');
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
    name: 'dual dialogue: caret after the name, with parentheticals and a second pair',
    fountain: `INT. BAR - NIGHT

BRICK
(smiling)
Hi.

STEEL ^
(grins)
Hey.
More.

STEEL (V.O.)
Screw retirement.

BRICK ^
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

const wellFormed = (xml: string): Document => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const err = doc.getElementsByTagName('parsererror');
  if (err.length) throw new Error('FDX is not well-formed XML: ' + err[0].textContent);
  return doc;
};

describe('FDX real elements', () => {
  const DUAL = `INT. BAR - NIGHT

BRICK
(smiling)
Hi.

STEEL ^
(grins)
Hey.
`;

  it('writes dual dialogue as one <DualDialogue> with both speakers and no caret as text', () => {
    const xml = scriptToFdx({ id: 'x', title: 'T', content: DUAL, format: 'screenplay', createdAt: '', updatedAt: '' });
    const doc = wellFormed(xml);
    const dual = doc.querySelectorAll('Content > DualDialogue');
    expect(dual).toHaveLength(1);
    expect([...dual[0].querySelectorAll('Paragraph')].map((p) => p.getAttribute('Type'))).toEqual(['Character', 'Parenthetical', 'Dialogue', 'Character', 'Parenthetical', 'Dialogue']);
    const texts = [...doc.querySelectorAll('Text')].map((t) => t.textContent ?? '');
    expect(texts.some((t) => t.includes('^'))).toBe(false);
  });

  it('round trips dual dialogue exactly (text -> FDX -> text)', async () => {
    const xml = await exportFdx(DUAL, 'T');
    expect(importToContent(xml, 'd.fdx').content).toBe(DUAL);
  });

  it('a caret on its own line becomes the caret after the second name, and is still dual', async () => {
    const src = `INT. A - DAY

STEEL
Yes.
^
BRICK
No.
`;
    const xml = await exportFdx(src, 'T');
    expect(xml).toContain('<DualDialogue>');
    expect(importToContent(xml, 'd.fdx').content).toBe(`INT. A - DAY

STEEL
Yes.

BRICK ^
No.
`);
  });

  it('writes centered text as an aligned Action paragraph, with no > < markers', async () => {
    const src = `INT. A - DAY

Body.

> THE END <
`;
    const xml = await exportFdx(src, 'T');
    const doc = wellFormed(xml);
    const centered = [...doc.querySelectorAll('FinalDraft > Content > Paragraph')].filter((p) => p.getAttribute('Alignment') === 'Center');
    expect(centered.map((p) => p.textContent?.trim())).toEqual(['THE END']);
    expect(centered[0].getAttribute('Type')).toBe('Action');
    expect(importToContent(xml, 'c.fdx').content).toBe(src);
  });

  it('writes the title page as a TitlePage and reads every key back', async () => {
    const src = `Title: My Film & Co
Credit: Written by
Author: Sam <s@x.io>
Source: Based on a book
Draft date: 1 Jan
Contact: a@b.c
  12 Road
  Town

INT. A - DAY

Body.
`;
    const xml = await exportFdx(src, 'My Film & Co');
    const doc = wellFormed(xml);
    expect(doc.querySelectorAll('FinalDraft > TitlePage > Content > Paragraph').length).toBe(8);
    // none of the title keys is body text
    expect([...doc.querySelectorAll('FinalDraft > Content Text')].map((t) => t.textContent)).toEqual(['INT. A - DAY', 'Body.']);
    expect(importToContent(xml, 't.fdx').content).toBe(src);
  });

  it('a script with no title page gets a generated one that is not imported back', async () => {
    const src = `INT. A - DAY

Body.
`;
    const xml = await exportFdx(src, 'Untitled');
    expect(wellFormed(xml).querySelectorAll('TitlePage > Content > Paragraph')).toHaveLength(1);
    expect(importToContent(xml, 'n.fdx').content).toBe(src);
  });

  it('reads the title page of a file that Final Draft wrote (no labels): title, credit, author, contact', () => {
    const para = (c: boolean, t: string) => `<Paragraph Alignment="${c ? 'Center' : 'Left'}"><Text>${t}</Text></Paragraph>`;
    const xml = `<?xml version="1.0"?><FinalDraft><Content><Paragraph Type="Scene Heading"><Text>INT. A - DAY</Text></Paragraph></Content>
<TitlePage><Content>${para(true, 'BIG FILM')}${para(true, 'Written by')}${para(true, 'Ann')}${para(false, 'ann@x.io')}</Content></TitlePage></FinalDraft>`;
    expect(importToContent(xml, 'fd.fdx').content).toBe('Title: BIG FILM\nCredit: Written by\nAuthor: Ann\nContact: ann@x.io\n\nINT. A - DAY\n');
  });

  it('sections and synopses are General paragraphs that keep their marker and come back exactly', async () => {
    const src = `# ACT ONE

= Brick arrives.

INT. A - DAY

Body.
`;
    const xml = await exportFdx(src, 'T');
    const types = [...wellFormed(xml).querySelectorAll('FinalDraft > Content > Paragraph')].map((p) => p.getAttribute('Type'));
    expect(types.slice(0, 2)).toEqual(['General', 'General']);
    expect(signature(importToContent(xml, 's.fdx').content)).toEqual(signature(src));
  });

  it('every case exports well-formed XML and leaks no dual or centered marker', async () => {
    for (const c of CASES) {
      const xml = await exportFdx(c.fountain, 'A & B <c>');
      const texts = [...wellFormed(xml).querySelectorAll('Text')].map((t) => t.textContent ?? '');
      expect(texts.some((t) => t.includes('^') || /^> THE END <$/.test(t))).toBe(false);
    }
  });
});
