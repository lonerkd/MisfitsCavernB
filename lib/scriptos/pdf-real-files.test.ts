// What real files do that the generator never does.
// Every case in pdf-layout.test.ts feeds the reader our own renderer's output: one
// text item per line, one speech column, a heading on every page. Files from other
// tools are not like that, and each case here was a real misread before it was fixed.

import { describe, expect, it } from 'vitest';
import { layoutPages } from './pdfLayout';
import { parseScript } from './parser';
import { generateScript, REAL_WORLD } from './corpus/generate';
import { renderPdfPages } from './corpus/render';
import type { PositionedItem } from './pdfImport';

const at = (str: string, x: number, y: number): PositionedItem => ({ str, transform: [12, 0, 0, 12, x, y] });
const page = (rows: Array<[string, number]>): PositionedItem[] => rows.map(([s, x], i) => at(s, x, 720 - i * 12));
const types = (text: string) => parseScript(text).lines.filter((l) => l.type !== 'empty').map((l) => l.type);

/** One text item per word, the way many producers emit text. */
function words(line: string, x: number, y: number): PositionedItem[] {
  const out: PositionedItem[] = [];
  let cx = x;
  for (const w of line.split(' ')) {
    out.push(at(w, cx, y));
    cx += w.length * 7.2 + 3.6;
  }
  return out;
}

describe('files from other tools', () => {
  it('reads a page emitted word by word, not line by line', () => {
    const t = layoutPages([[
      ...words('INT. KITCHEN - NIGHT', 108, 700),
      ...words('Maya pours coffee and watches the door.', 108, 676),
      ...words('MAYA', 252, 640),
      ...words('You are late again.', 180, 628),
    ]]);
    expect(types(t)).toEqual(['slug', 'action', 'character', 'dialogue']);
    expect(t).toContain('Maya pours coffee and watches the door.');
    expect(t).toContain('MAYA\nYou are late again.');
  });

  it('keeps a cue and its speech apart when a producer puts them on one baseline', () => {
    const t = layoutPages([page([['INT. ROOM - DAY', 108], ['MAYA', 252], ['Hello there.', 180]])]);
    expect(types(t)).toEqual(['slug', 'character', 'dialogue']);
    expect(t).toContain('MAYA\nHello there.');
  });

  it('reads a fragment with no scene heading at all', () => {
    const t = layoutPages([page([['MAYA', 252], ['We should go.', 180], ['JORDAN', 252], ['Not yet.', 180]])]);
    expect(types(t)).toEqual(['character', 'dialogue', 'character', 'dialogue']);
    expect(t).toBe('MAYA\nWe should go.\n\nJORDAN\nNot yet.');
  });

  it('reads a page whose action margin is empty, without swallowing the speech', () => {
    const t = layoutPages([page([['INT. ROOM - DAY', 108], ['MAYA', 252], ['We should go.', 180], ['JORDAN', 252], ['Not yet.', 180]])]);
    expect(types(t)).toEqual(['slug', 'character', 'dialogue', 'character', 'dialogue']);
  });

  it('reads dual dialogue as two speeches, and marks the second with a caret', () => {
    // Cues centred over their own dialogue on one baseline; the two speeches
    // interleaved below them. Single-speech scenes come first so the columns are
    // learned from a normal page. Explicit y values, because a screenplay has a
    // blank line between elements and that gap is what separates them.
    const rows: Array<[string, number, number]> = [
      ['INT. KITCHEN - NIGHT', 108, 720],
      ['Maya pours coffee.', 108, 696],
      ['MAYA', 252, 660],
      ['You are late again.', 180, 648],
      ['JORDAN', 252, 624],
      ['Traffic.', 180, 612],
      ['MAYA', 200, 576],
      ['JORDAN', 380, 576],
      ['I told you', 180, 564],
      ['You did not.', 360, 564],
      ['three times.', 180, 552],
      ['Not once.', 360, 552],
    ];
    const t = layoutPages([rows.map(([s, x, y]) => at(s, x, y))]);
    expect(t).toContain('MAYA\nI told you three times.');
    expect(t).toContain('JORDAN ^\nYou did not. Not once.');
    const parsed = parseScript(t);
    expect(parsed.characters.map((c) => c.name)).toEqual(['MAYA', 'JORDAN']);
    // Fountain marks the second speech of a pair with a trailing caret, and the
    // parser records the pairing on the cue's meta rather than as its own line.
    const cues = parsed.lines.filter((l) => l.type === 'character');
    expect(cues.map((l) => l.meta?.isDualDialogue)).toEqual([false, false, true, true]);
  });

  it('a script with one speech column is never read as dual', () => {
    const t = layoutPages(renderPdfPages(generateScript(33, REAL_WORLD)));
    expect(t).not.toContain('^');
  });
});
