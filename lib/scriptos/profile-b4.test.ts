import { describe, expect, it } from 'vitest';
import { documentProfile } from './decode';
import { parseScript } from './parser';

// B4, the first pieces of the document profile, and the grammar facts found by reading hand-written scripts
// (corpus/handwritten). Each case says what a reader would say; none was fitted to the seeded generator.
const types = (src: string) => parseScript(src).lines.filter((l) => l.type !== 'empty').map((l) => l.type);
const HEAD = 'INT. BUNKER - NIGHT\n';

describe('the document profile: does this script use blank lines at all?', () => {
  const obs = (src: string) => src.split('\n').map((t) => ({ text: t.trim(), kind: t.trim() ? 'free' : 'empty', prevBlank: false, next: '' })) as never;

  it('a script with blank lines between its elements is not tight', () => {
    expect(documentProfile(obs('A\n\nB\n\nC\n\nD\n\nE\n\nF\n\nG\n')).tight).toBe(false);
  });
  it('a script with none (pasted from another editor) is tight', () => {
    expect(documentProfile(obs('A\nB\nC\nD\nE\nF\nG\nH\nI\nJ\nK\nL')).tight).toBe(true);
  });
  it('a trailing newline (a final empty line) does not count against a script with no blank lines', () => {
    expect(documentProfile(obs('A\nB\nC\nD\nE\nF\nG\nH\nI\nJ\n')).tight).toBe(true);
    expect(documentProfile(obs('\nA\nB\nC\nD\nE\nF\nG\nH\nI\nJ\n\n')).tight).toBe(true);
    expect(documentProfile(obs('A\nB\nC\nD\nE\n\nF\nG\nH\nI\nJ\n')).tight).toBe(false); // a real blank line in the middle still counts
  });
  it('a short snippet is never called tight: there is too little to tell', () => {
    expect(documentProfile(obs('A\nB\nC')).tight).toBe(false);
  });
});

describe('in a script with no blank lines, a cue straight after a speech is still a cue', () => {
  const tight = [
    HEAD + 'A radio crackles.',
    'MAN #1', 'We should go.',
    "WOMAN'S VOICE (ON RADIO)", 'Stay where you are.',
    'MAN #1', 'Understood.',
    'WOMAN', 'Good.',
    'MAN #1', 'Moving.',
  ].join('\n');

  it('reads every cue and every speech', () => {
    expect(types(tight)).toEqual(['slug', 'action', 'character', 'dialogue', 'character', 'dialogue', 'character', 'dialogue', 'character', 'dialogue', 'character', 'dialogue']);
  });

  it('a single-word cue after a speech is a cue, not more dialogue', () => {
    const r = parseScript(tight).lines.filter((l) => l.type === 'character').map((l) => l.text);
    expect(r).toContain('WOMAN');
  });

  it('the same script written the usual way reads the same', () => {
    expect(types(tight.split('\n').join('\n\n').replace(/\n\n(?=(?:We|Stay|Understood|Good|Moving))/g, '\n'))).toEqual(types(tight));
  });
});

describe('a line that opens with a character\'s name and goes on to narrate is action', () => {
  it('"Maya ducks." after a speech with no blank line is action; "Maya, wait." is her being spoken to', () => {
    const src = [HEAD + 'MAYA', 'We should go.', 'Maya ducks under a beam.', 'MAYA', 'Now.', 'DOUG', 'Maya, wait.', 'MAYA', 'What?', 'DOUG', 'Nothing.', 'MAYA', 'Fine.'].join('\n');
    const read = parseScript(src).lines;
    expect(read.find((l) => l.text === 'Maya ducks under a beam.')?.type).toBe('action');
    expect(read.find((l) => l.text === 'Maya, wait.')?.type).toBe('dialogue');
  });
});

describe('what cannot be a cue', () => {
  it('a caps line with a scene heading right under it has no speech under it', () => {
    expect(types('INT. A - NIGHT\n\nMAN\nWe should go.\n\nTWO HOURS LATER\nINT. B - DAWN\n\nMAN\nOk.\n')).toEqual(['slug', 'character', 'dialogue', 'action', 'slug', 'character', 'dialogue']);
  });

  it('a time card on a line of its own is narration, and ends a speech even with no blank line above it', () => {
    for (const card of ['TWO HOURS LATER', 'MOMENTS LATER', 'THE NEXT MORNING', 'MEANWHILE', 'LATER', 'THAT NIGHT']) {
      const read = parseScript(`INT. A - NIGHT\nMAN\nWe should go.\n${card}\nINT. B - DAWN\n`).lines;
      expect(read.find((l) => l.text === card)?.type, card).toBe('action');
    }
  });

  it('but shouting the same words in a speech is still speech', () => {
    expect(types('INT. A - NIGHT\n\nMAN\nSEE YOU LATER.\n')).toEqual(['slug', 'character', 'dialogue']);
  });
});

describe('transitions to black and white, however the writer qualifies them', () => {
  it('SMASH CUT TO BLACK. and its relatives are transitions', () => {
    for (const t of ['SMASH CUT TO BLACK.', 'MATCH CUT TO WHITE', 'HARD CUT TO BLACK', 'SLOW FADE TO BLACK.', 'DISSOLVE TO WHITE', 'CUT TO BLACK']) {
      const read = parseScript(`INT. A - NIGHT\n\nMaya waits.\n\n${t}\n\nINT. B - DAY\n`).lines;
      expect(read.find((l) => l.text === t)?.type, t).toBe('transition');
    }
  });
  it('a sentence that merely mentions black is not', () => {
    const read = parseScript('INT. A - NIGHT\n\nThe room cuts to black as the lights fail.\n').lines;
    expect(read.find((l) => l.text.startsWith('The room'))?.type).toBe('action');
  });
});
