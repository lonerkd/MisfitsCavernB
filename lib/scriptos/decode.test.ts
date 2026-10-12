import { describe, expect, it } from 'vitest';
import { parseScript } from './parser';

// B5 of the deep-brain plan: the whole-document decoder (lib/scriptos/decode.ts).
// Hand-written scripts — not the corpus generator — so this checks the decoder
// against situations written independently of how it was tuned.

const HEAD = 'INT. ROOM - DAY\n\n';
const read = (src: string, decoder = true) => parseScript(src, 'screenplay', undefined, { decoder }).lines.filter((l) => l.type !== 'empty');
const types = (src: string, decoder = true) => read(src, decoder).map((l) => l.type);

describe('the three failures the line-by-line classifier could not fix', () => {
  it('a shouted speech keeps its cue', () => {
    expect(types(HEAD + 'MAYA\nSTOP RIGHT THERE!\n')).toEqual(['slug', 'character', 'dialogue']);
    expect(types(HEAD + 'MAYA\nNO. NO. NO.\n')).toEqual(['slug', 'character', 'dialogue']);
    expect(types(HEAD + 'MAYA\nNO!\n\nLEO\nRUN!\n')).toEqual(['slug', 'character', 'dialogue', 'character', 'dialogue']);
    expect(types(HEAD + 'MAYA\nSTOP RIGHT THERE!\n', false)).toEqual(['slug', 'action', 'action']); // what it used to do
  });

  it('a (parenthetical) between two speeches is a parenthetical', () => {
    expect(types(HEAD + 'MAYA\nHello.\n(beat)\nGoodbye.\n')).toEqual(['slug', 'character', 'dialogue', 'parenthetical', 'dialogue']);
    expect(types(HEAD + 'MAYA\n(quietly)\nHello.\n(beat)\n(softer)\nGoodbye.\n')).toEqual(['slug', 'character', 'parenthetical', 'dialogue', 'parenthetical', 'parenthetical', 'dialogue']);
  });

  it('an ALL-CAPS action line followed straight by action is not a character', () => {
    expect(types(HEAD + 'THE DOOR EXPLODES.\nMaya ducks.\n')).toEqual(['slug', 'action', 'action']);
    expect(parseScript(HEAD + 'THE DOOR EXPLODES.\nMaya ducks.\n').scenes[0].characters).toEqual([]);
  });
});

describe('what still reads the same', () => {
  it('a cue, its speech, a blank line ends the speech', () => {
    expect(types(HEAD + 'MAYA\nHello.\n\nShe leaves.\n')).toEqual(['slug', 'character', 'dialogue', 'action']);
  });

  it('a wrapped speech stays one speech, and dialogue continues until a blank line', () => {
    expect(types(HEAD + 'MAYA\nFirst line.\nSecond line.\n')).toEqual(['slug', 'character', 'dialogue', 'dialogue']);
  });

  it('a cue straight after action, with no blank line, is still a cue', () => {
    expect(types(HEAD + 'He turns.\nMAYA\nHi.\n')).toEqual(['slug', 'action', 'character', 'dialogue']);
  });

  it('a lone caps word with nothing under it is action, not a cue', () => {
    expect(types(HEAD + 'SILENCE.\n\nMaya waits.\n')).toEqual(['slug', 'action', 'action']);
    expect(types(HEAD + 'LATER\n\nMaya waits.\n')).toEqual(['slug', 'action', 'action']);
  });

  it('a wrapped line outside a speech stays a parenthetical, so the validator can flag it', () => {
    expect(types(HEAD + '(alone in the dark)\n\nSAM enters.\n')).toEqual(['slug', 'parenthetical', 'action']);
  });

  it('headings, transitions and forced elements are not second-guessed', () => {
    const t = types('FADE IN:\n\nINT. ROOM - DAY\n\n.SNIPER SCOPE\n\n@mcBRIDE\nHello.\n\n> CUT TO:\n');
    expect(t).toEqual(['transition', 'slug', 'slug', 'character', 'dialogue', 'transition']);
  });

  it('a long cue name (six words) is still a cue', () => {
    expect(types(HEAD + 'THE OLD MAN FROM THE HARBOR\nHello there.\n')).toEqual(['slug', 'character', 'dialogue']);
  });

  it('a speaker who forgot the blank line above their cue is still a speaker', () => {
    expect(types(HEAD + 'MAYA\nHi.\nLEO\nHey.\n')).toEqual(['slug', 'character', 'dialogue', 'character', 'dialogue']);
  });

  it('a long all-caps sentence is action, a shouted name is speech', () => {
    expect(types(HEAD + 'THE KETTLE SCREAMS AND THE WINDOW RATTLES IN THE WIND.\n\nMaya waits.\n')).toEqual(['slug', 'action', 'action']);
    expect(types(HEAD + 'MAYA\nLEO!\n')).toEqual(['slug', 'character', 'dialogue']);
  });

  it('a cue with an extension and a name with a full stop', () => {
    expect(types(HEAD + 'DR. LEE (O.S.)\nSit down.\n')).toEqual(['slug', 'character', 'dialogue']);
  });

  it('uncased scripts: a short name then its sentence', () => {
    expect(types(HEAD + '美雅\n你好。\n')).toEqual(['slug', 'character', 'dialogue']);
  });
});

describe('the decoder is deterministic and says how sure it is', () => {
  const SRC = HEAD + 'MAYA\nSTOP RIGHT THERE!\n\nTHE DOOR EXPLODES.\nMaya ducks.\n';

  it('reads the same twice', () => {
    expect(types(SRC)).toEqual(types(SRC));
    expect(read(SRC).map((l) => l.confidence)).toEqual(read(SRC).map((l) => l.confidence));
  });

  it('every decoded line has a confidence between 40 and 100, and a clear heading beats an ambiguous caps line', () => {
    const lines = read(SRC);
    for (const l of lines) { expect(l.confidence).toBeGreaterThanOrEqual(40); expect(l.confidence).toBeLessThanOrEqual(100); }
    const heading = lines.find((l) => l.type === 'slug')!;
    const ambiguous = lines.find((l) => l.text === 'THE DOOR EXPLODES.')!;
    expect(heading.confidence).toBeGreaterThan(ambiguous.confidence);
  });

  it('says which label it chose', () => {
    expect(read(HEAD + 'MAYA\nHi.\n').every((l) => /Decoded as/.test(l.reasoning ?? ''))).toBe(true);
  });
});

describe('where it is still debatable (pinned, so a change is a decision)', () => {
  it('two caps lines in a row: a name with nothing under it is not a speaker, so the first is action and the second is the cue', () => {
    expect(types(HEAD + 'MAYA\nLEO\nHi.\n')).toEqual(['slug', 'action', 'character', 'dialogue']);
  });

  it('an ALL-CAPS line before prose with a blank line above it is a cue, as the Fountain spec says', () => {
    expect(types(HEAD + 'SUDDENLY\nA hand grabs her.\n')).toEqual(['slug', 'character', 'dialogue']);
  });
});
