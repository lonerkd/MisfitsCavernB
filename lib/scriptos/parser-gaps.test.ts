import { describe, expect, it } from 'vitest';
import { parseScript } from './parser';

// Where the screenplay classifier is wrong TODAY, found by comparing it with
// the old "Deep Brain 3.0" parser (2026-10-11, BACKLOG 3.20). Each gap is an
// `it.fails`: it passes while the gap exists and FAILS once the parser is
// fixed — then change it to `it` and keep it as the regression test.
// The `it` cases at the end pin what is already right (and what the old
// parser got wrong), so a fix for one thing can't undo another.

const HEAD = 'INT. ROOM - DAY\n\n';
const types = (src: string) => parseScript(src).lines.filter((l) => l.type !== 'empty').map((l) => l.type);
const typeOfLine = (line: string, before = HEAD, after = '\n\nMaya waits.\n') => {
  const r = parseScript(before + line + after);
  return r.lines[before.split('\n').length - 1]?.type;
};

describe('KNOWN GAPS in the classifier', () => {
  it('a numbered heading with a period is a scene heading ("12. INT. HOUSE - DAY")', () => {
    expect(typeOfLine('12. INT. HOUSE - DAY')).toBe('slug');
    expect(typeOfLine('12A. INT. HOUSE - DAY')).toBe('slug');
  });

  it('FADE OUT. and CUT TO BLACK. (with a full stop) are transitions', () => {
    expect(typeOfLine('FADE OUT.')).toBe('transition');
    expect(typeOfLine('CUT TO BLACK.')).toBe('transition');
  });

  it('transitions written without the colon are transitions (DISSOLVE TO, SMASH CUT TO)', () => {
    expect(typeOfLine('DISSOLVE TO')).toBe('transition');
    expect(typeOfLine('SMASH CUT TO')).toBe('transition');
    expect(typeOfLine('FLASH CUT TO:')).toBe('transition');
  });

  it('a (parenthetical) between two speeches is a parenthetical, not dialogue', () => {
    expect(types(HEAD + 'MAYA\nHello.\n(beat)\nGoodbye.\n')).toEqual(['slug', 'character', 'dialogue', 'parenthetical', 'dialogue']);
  });

  it('a speech in ALL CAPS keeps its cue (shouting is still dialogue)', () => {
    expect(types(HEAD + 'MAYA\nSTOP RIGHT THERE!\n')).toEqual(['slug', 'character', 'dialogue']);
    expect(types(HEAD + 'MAYA\nNO. NO. NO.\n')).toEqual(['slug', 'character', 'dialogue']);
  });

  it('an ALL-CAPS action line followed straight by action is not a character cue', () => {
    expect(types(HEAD + 'THE DOOR EXPLODES.\nMaya ducks.\n')).toEqual(['slug', 'action', 'action']);
  });

  it('a line that merely contains "draft" is not a title page', () => {
    expect(typeOfLine('A cold draft blows through.', '', '\n\nINT. ROOM - DAY\n\nMaya waits.\n')).toBe('action');
  });

  it('a character in a non-Latin script is still a character (Cyrillic, CJK, Arabic)', () => {
    expect(types(HEAD + 'МАЙЯ\nПривет.\n')).toEqual(['slug', 'character', 'dialogue']);
    expect(types(HEAD + '美雅\n你好。\n')).toEqual(['slug', 'character', 'dialogue']);
  });

  it('a sentence that begins with the word Interior/Exterior is action, not a scene heading', () => {
    expect(typeOfLine('Interior lights flicker on.')).toBe('action');
    expect(typeOfLine('Exterior shots hold steady.')).toBe('action');
  });

  it('(fixed in B2) dual dialogue as Fountain writes it — a caret AFTER the second name (LEO ^) — is dual', () => {
    const r = parseScript(HEAD + 'MAYA\nHi.\n\nLEO ^\nHey.\n');
    expect(r.lines.some((l) => l.meta?.isDualDialogue)).toBe(true);
    expect(r.scenes[0].characters).toContain('LEO');
  });

  it.fails('the character list says where each character first appears', () => {
    const { characters } = parseScript(HEAD + 'MAYA\nHi.\n\nLEO\nHey.\n');
    expect(characters.find((c) => c.name === 'LEO')?.firstLineIndex).toBe(6);
  });
});

describe('what the old parser got wrong and this one gets right', () => {
  it('a sentence that merely STARTS with INT/EXT/EST letters is not a scene heading', () => {
    for (const line of ['Into the room walks Maya.', 'EXTRA MAN stumbles in.', 'Interesting choice, says Maya.', 'Estimated time is short.', 'INTERVIEWER leans in.']) {
      expect(typeOfLine(line)).not.toBe('slug');
    }
  });

  it('blank lines are kept (the text round-trips), and a cue with an extension carries its dialogue', () => {
    const src = HEAD + 'MAYA (V.O.)\nIt was a long night.\n';
    const r = parseScript(src);
    expect(r.lines.map((l) => l.text).join('\n')).toBe(src);
    expect(types(src)).toEqual(['slug', 'character', 'dialogue']);
  });

  it('Fountain’s forced elements are never second-guessed (@, ., !, ~, >, [[note]], /* boneyard */)', () => {
    expect(types(HEAD + '@mc\nHello.\n\n.SNIPER SCOPE\n\n!ALL CAPS ACTION\n\n[[a note]]\n')).toEqual(['slug', 'character', 'dialogue', 'slug', 'action', 'note']);
  });

  it('dual dialogue is understood with a leading or lone caret (^LEO, or ^ on its own line)', () => {
    expect(parseScript(HEAD + 'MAYA\nHi.\n\n^LEO\nHey.\n').lines.some((l) => l.meta?.isDualDialogue)).toBe(true);
    expect(parseScript(HEAD + 'MAYA\nHi.\n^\nLEO\nHey.\n').lines.some((l) => l.meta?.isDualDialogue)).toBe(true);
  });
});
