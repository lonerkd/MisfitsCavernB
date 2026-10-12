import { describe, expect, it } from 'vitest';
import { layoutPages } from './pdfLayout';
import { parseScript } from './parser';
import { generateScript, REAL_WORLD } from './corpus/generate';
import { renderPdfPages } from './corpus/render';
import type { PositionedItem } from './pdfImport';

// B6 of the deep-brain plan: the PDF is read from where its text sits, not from fixed coordinates.

const at = (str: string, x: number, y: number): PositionedItem => ({ str, transform: [12, 0, 0, 12, x, y] });
/** One page of rows [text, x], 12 pt apart; a null row is a blank line. */
const page = (rows: Array<[string, number] | null>, extra: PositionedItem[] = []): PositionedItem[] =>
  [...rows.flatMap((r, i) => (r ? [at(r[0], r[1], 700 - i * 12)] : [])), ...extra];
const types = (text: string) => parseScript(text).lines.filter((l) => l.type !== 'empty').map((l) => l.type);

describe('the page it learns', () => {
  const els = generateScript(21, REAL_WORLD);
  const base = layoutPages(renderPdfPages(els));

  it('reads a script the same on any margin, page size or font size', () => {
    for (const layout of [{ shift: -72 }, { shift: -36 }, { shift: -8 }, { shift: 36 }, { scale: 0.85 }, { scale: 1.2 }, { shift: -20, scale: 1.1 }]) {
      expect(layoutPages(renderPdfPages(els, layout))).toBe(base);
    }
  });

  it('writes a cue with its speech directly under it, and a blank line between elements', () => {
    const t = layoutPages([page([['INT. ROOM - DAY', 108], null, ['MAYA', 252], ['(quietly)', 223], ['You are late.', 180], null, ['CUT TO:', 396]])]);
    expect(t).toBe('INT. ROOM - DAY\n\nMAYA\n(quietly)\nYou are late.\n\nCUT TO:');
    expect(types(t)).toEqual(['slug', 'character', 'parenthetical', 'dialogue', 'transition']);
  });

  it('joins wrapped lines, and words hyphenated across a line break', () => {
    const t = layoutPages([page([['EXT. PIER - DAY', 108], null, ['Boats come in one by one, their lights swinging a-', 108], ['cross the water.', 108], null, ['MAYA', 252], ['I waited up for', 180], ['you all night.', 180]])]);
    expect(t).toContain('Boats come in one by one, their lights swinging across the water.');
    expect(t).toContain('MAYA\nI waited up for you all night.');
  });

  it('keeps two action paragraphs apart (the blank line between them is a vertical gap)', () => {
    const t = layoutPages([page([['INT. ROOM - DAY', 108], null, ['First paragraph.', 108], null, ['Second paragraph.', 108]])]);
    expect(t).toBe('INT. ROOM - DAY\n\nFirst paragraph.\n\nSecond paragraph.');
  });
});

describe('page furniture', () => {
  it('drops page numbers, CONTINUED and MORE, by what they say and where they sit', () => {
    const t = layoutPages([
      page([['INT. ROOM - DAY', 108], null, ['MAYA', 252], ['Hello there.', 180], ['(MORE)', 252]], [at('1.', 540, 740)]),
      page([['(CONTINUED)', 108], ['EXT. PIER - DAY', 108]], [at('2.', 540, 740)]),
    ]);
    expect(t).toBe('INT. ROOM - DAY\n\nMAYA\nHello there.\n\nEXT. PIER - DAY');
  });

  it('a speech that runs over the page continues after (MORE), and a repeated cue starts a new speech', () => {
    const cont = layoutPages([
      page([['INT. ROOM - DAY', 108], null, ['MAYA', 252], ['I waited up for you all night and', 180], ['(MORE)', 252]]),
      page([["MAYA (CONT'D)", 252], ['never once heard from you.', 180]]),
    ]);
    expect(cont).toBe("INT. ROOM - DAY\n\nMAYA\nI waited up for you all night and\n\nMAYA (CONT'D)\nnever once heard from you.");
    const bare = layoutPages([
      page([['INT. ROOM - DAY', 108], null, ['MAYA', 252], ['I waited up for you all night and', 180], ['(MORE)', 252]]),
      page([['never once heard from you.', 180]]),
    ]);
    expect(bare).toBe('INT. ROOM - DAY\n\nMAYA\nI waited up for you all night and never once heard from you.');
  });

  it('scene numbers printed in the margins are not part of the heading, and are kept as Fountain scene numbers', () => {
    const t = layoutPages([page(
      [['INT. KITCHEN - NIGHT', 108], null, ['Maya pours coffee.', 108], null, ['INT. PIER - DAY', 108], null, ['Boats.', 108]],
      [at('12', 72, 700), at('12', 520, 700), at('13A', 72, 700 - 48), at('13A', 520, 700 - 48)],
    )]);
    expect(t).toBe('INT. KITCHEN - NIGHT #12#\n\nMaya pours coffee.\n\nINT. PIER - DAY #13A#\n\nBoats.');
    const sc = parseScript(t).scenes;
    expect(sc.map((s) => s.sceneNumber)).toEqual(['12', '13A']);
    expect(sc[0].heading).toBe('INT. KITCHEN - NIGHT');
  });
});

describe('what it does not mistake', () => {
  it('names with hyphens, accents and extensions are cues; FADE OUT. is a transition', () => {
    const t = layoutPages([page([['INT. ROOM - DAY', 108], null, ['MARY-ANN', 252], ['Hello.', 180], null, ['JOSÉ', 252], ['Hola.', 180], null, ['LEO (O.S.)', 252], ['Traffic.', 180], null, ['FADE OUT.', 396]])]);
    expect(types(t)).toEqual(['slug', 'character', 'dialogue', 'character', 'dialogue', 'character', 'dialogue', 'transition']);
  });

  it('a speech in a script with no capitals still has its cue (CJK)', () => {
    const t = layoutPages([page([['INT. ROOM - DAY', 108], null, ['美雅', 252], ['你好。', 180], null, ['李伟', 252], ['再见。', 180]])]);
    expect(types(t)).toEqual(['slug', 'character', 'dialogue', 'character', 'dialogue']);
  });

  it('a very short document and an empty one are fine', () => {
    expect(layoutPages([page([['INT. ROOM - DAY', 108], null, ['MAYA', 252], ['Hi.', 180]])])).toBe('INT. ROOM - DAY\n\nMAYA\nHi.');
    expect(layoutPages([])).toBe('');
    expect(layoutPages([[]])).toBe('');
  });

  it('a scanned page (no text items) reads as empty, so the editor can say so', () => {
    expect(layoutPages([[], []]).trim()).toBe('');
  });
});
