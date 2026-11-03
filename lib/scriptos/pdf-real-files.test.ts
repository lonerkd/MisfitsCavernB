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

// ── What a library of real files does that even other producers don't ────────
// Each case below was a whole class of misreads across a measured library, not
// a one-off: a transcript set solid at one margin, a cue margin shared with its
// parentheticals, cues centred over their speeches, camera set-ups at the cue
// margin, a heading with a scene number in front of it, a heading with no
// INT./EXT. at all, a speaker written "Name:", and a font that encodes its
// dash as something else.

describe('files from a library of every kind', () => {
  const rows = (rs: Array<[string, number, number]>): PositionedItem[] => rs.map(([s, x, y]) => at(s, x, y));

  it('reads a transcript set solid at one margin: cues by text convention alone', () => {
    const t = layoutPages([rows([
      ['INTERIOR- DINER- DAY', 90, 720],
      ['A waitress refills the coffee.', 90, 708],
      ['MAYA', 90, 696],
      ['You look tired.', 90, 684],
      ['JORDAN', 90, 672],
      ['I am tired.', 90, 660],
    ])]);
    expect(types(t)).toEqual(['slug', 'action', 'character', 'dialogue', 'character', 'dialogue']);
  });

  it('reads a cue margin that also carries its parentheticals, set solid', () => {
    // Uniform spacing (no blank lines anywhere), action 108, dialogue 160, and
    // a cue column at 203 that is one third brackets: the column is judged on
    // its non-bracket lines, and a bracket there is a parenthetical, not a name.
    const t = layoutPages([rows([
      ['INT. YARD - DAY', 108, 720],
      ['Maya hangs the laundry.', 108, 708],
      ['MAYA', 203, 696],
      ['(quietly)', 203, 684],
      ['This line is dry.', 160, 672],
      ['The wind picks up.', 108, 660],
      ['JORDAN', 203, 648],
      ['It is not.', 160, 636],
    ])]);
    expect(types(t)).toEqual(['slug', 'action', 'character', 'parenthetical', 'dialogue', 'action', 'character', 'dialogue']);
  });

  it('reads cues centred over their speeches, where every cue starts at its own x', () => {
    // Cues centred: a long name starts further left than a short one, so the
    // cue "column" is a band of starting positions that must not chain the
    // dialogue and the parenthetical margins into one giant column.
    const t = layoutPages([rows([
      ['INT. HALL - NIGHT', 138, 720],
      ['Maya waits by the door.', 138, 708],
      ['MAYA', 222, 696],
      ['You came.', 174, 684],
      ['THE DOORMAN', 204, 672],
      ['(looking her over)', 190, 660],
      ['Always do.', 174, 648],
      ['JORDAN', 216, 636],
      ['Not anymore.', 174, 624],
    ])]);
    const parsed = parseScript(t);
    expect(parsed.characters.map((c) => c.name).sort()).toEqual(['JORDAN', 'MAYA', 'THE DOORMAN']);
  });

  it('treats camera set-ups at the cue margin as action, not characters', () => {
    const t = layoutPages([rows([
      ['INT. PIER - DAY', 108, 720],
      ['ANOTHER ANGLE', 252, 708],
      ['The pier empties.', 108, 696],
      ['BRODY', 252, 684],
      ['We close at six.', 180, 672],
    ])]);
    const parsed = parseScript(t);
    expect(parsed.characters.map((c) => c.name)).toEqual(['BRODY']);
    expect(types(t)[1]).toBe('action');
  });

  it('demotes a cue that no speech follows: a name that named nothing', () => {
    const t = layoutPages([rows([
      ['BRODY', 252, 720],
      ['INT. OFFICE - DAY', 108, 708],
      ['The office is quiet.', 108, 696],
    ])]);
    expect(parseScript(t).characters.map((c) => c.name)).toEqual([]);
  });

  it('reads a heading with a scene number in front of it', () => {
    const t = layoutPages([rows([
      ['SCENE 4 - INT. CONCERT HALL - NIGHT', 138, 720],
      ['The audience settles.', 138, 708],
    ])]);
    expect(types(t)).toEqual(['slug', 'action']);
  });

  it('reads a heading with no INT./EXT. at all: capitals, a dash, a time of day', () => {
    const t = layoutPages([rows([
      ['WAREHOUSE - NIGHT.', 108, 720],
      ['Maya waits by the door.', 108, 692],
    ])]);
    expect(types(t)).toEqual(['slug', 'action']);
    expect(parseScript(t).scenes).toHaveLength(1);
  });

  it('splits a speaker written "Name:" with the speech on the same baseline', () => {
    const t = layoutPages([[at('MARCUS:', 134, 720), at('That was a long night.', 177, 720)]]);
    expect(types(t)).toEqual(['character', 'dialogue']);
    expect(t).toContain('MARCUS\nThat was a long night.');
  });

  it('keeps a title-case cue with a colon ("She:") as a speaker, colon dropped', () => {
    // A two-hander written "She:" / "He:" — title case with a colon, centred.
    // Several exchanges, because a column is judged on a population.
    const t = layoutPages([rows([
      ['EXT. WOODS - DAY', 90, 720],
      ['She walks the path.', 90, 700],
      ['She:', 287, 680],
      ['(Off)', 287, 668],
      ['I cannot really tell.', 201, 656],
      ['He:', 289, 636],
      ['(Off)', 287, 624],
      ['It should be easy, passing along the path.', 201, 612],
      ['She:', 287, 592],
      ['But it is heavy to drag yourself past.', 201, 580],
      ['He:', 289, 560],
      ['Then rest.', 201, 548],
    ])]);
    const parsed = parseScript(t);
    // The parser records title-case cues in capitals (its cast is case-folded).
    expect(parsed.characters.map((c) => c.name)).toEqual(['SHE', 'HE']);
    expect(t).toContain('She\n(Off)');
  });

  it('straightens a dash that the font encoded as a low quote', () => {
    const t = layoutPages([rows([
      ['EXT. BEACH ‚ NIGHT', 108, 720],
      ['Waves at the shoreline.', 108, 708],
    ])]);
    expect(t).toContain('EXT. BEACH - NIGHT');
    expect(types(t)[0]).toBe('slug');
  });
});
