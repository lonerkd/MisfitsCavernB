import { describe, expect, it } from 'vitest';
import { parseScript } from './parser';

// B3 of the deep-brain plan: the evidence layer (L1) — what a line looks like.

const HEAD = 'INT. ROOM - DAY\n\n';
const types = (src: string) => parseScript(src).lines.filter((l) => l.type !== 'empty').map((l) => l.type);
const typeOf = (line: string) => parseScript(HEAD + line + '\n\nMaya waits.\n').lines[2]?.type;

describe('scene headings', () => {
  it.each([
    'INT. HOUSE - DAY', 'int. house - day', 'EXT. PIER - NIGHT', 'INT./EXT. CAR - DAY', 'I/E CAR - NIGHT', 'EST. SKYLINE - DAWN',
    'INT HOUSE - DAY', 'INT HOUSE', 'INTERIOR. KITCHEN - DAY', 'EXTERIOR - A FIELD',
    '12 INT. HOUSE - DAY', '12. INT. HOUSE - DAY', '12A INT. HOUSE - DAY', '12A. INT. HOUSE - DAY',
  ])('%s is a scene heading', (h) => expect(typeOf(h)).toBe('slug'));

  it.each([
    'Interior lights flicker on.', 'Exterior shots hold steady.', 'Into the room walks Maya.', 'EXTRA MAN stumbles in.',
    'Interesting choice, says Maya.', 'Estimated time is short.', 'INTERVIEWER leans in.', 'Int the world, she said.',
  ])('%s is not', (line) => expect(typeOf(line)).not.toBe('slug'));

  it('a numbered heading’s scene number and location are read', () => {
    const sc = parseScript('12. INT. KITCHEN - NIGHT\n\nText.\n').scenes[0];
    expect(sc.sceneNumber).toBe('12');
    expect(sc.location).toBe('KITCHEN');
    expect(sc.timeOfDay).toBe('NIGHT');
  });
});

describe('transitions, however they are punctuated', () => {
  it.each([
    'CUT TO:', 'CUT TO', 'CUT TO BLACK.', 'CUT TO BLACK', 'FADE OUT.', 'FADE OUT', 'FADE OUT:', 'FADE TO BLACK.',
    'DISSOLVE TO:', 'DISSOLVE TO', 'SMASH CUT TO', 'SMASH CUT TO:', 'FLASH CUT TO:', 'MATCH CUT TO', 'WIPE TO:', 'BACK TO:', 'INTERCUT', 'BLACKOUT',
  ])('%s', (t) => expect(typeOf(t)).toBe('transition'));

  it('FADE IN: at the top is still a transition, not a title page', () => {
    expect(types('FADE IN:\n\nINT. ROOM - DAY\n\nText.\n')[0]).toBe('transition');
  });

  it('a character who speaks is not mistaken for a transition', () => {
    expect(types(HEAD + 'MAYA\nCut to the chase.\n')).toEqual(['slug', 'character', 'dialogue']);
  });
});

describe('names are kept as written', () => {
  const r = parseScript(HEAD + 'DR. LEE\nSit down.\n\nOFFICER 2\nFreeze.\n\nMARY-ANN\nHello.\n\nJOSÉ\nHola.\n\nO\'BRIEN\nEasy.\n');

  it('with their full stops, digits, hyphens, accents and apostrophes', () => {
    expect(r.scenes[0].characters).toEqual(['DR. LEE', 'OFFICER 2', 'MARY-ANN', 'JOSÉ', "O'BRIEN"]);
    expect(r.characters.map((c) => c.name).sort()).toEqual(["DR. LEE", 'JOSÉ', 'MARY-ANN', "O'BRIEN", 'OFFICER 2'].sort());
  });

  it('every cue is a character and every speech is dialogue', () => {
    expect(types(r.lines.map((l) => l.text).join('\n'))).toEqual(['slug', 'character', 'dialogue', 'character', 'dialogue', 'character', 'dialogue', 'character', 'dialogue', 'character', 'dialogue']);
  });

  it('an extension is not part of the name, and a trailing full stop is not', () => {
    expect(parseScript(HEAD + 'LEO (O.S.)\nTraffic.\n').scenes[0].characters).toEqual(['LEO']);
  });
});

describe('scripts in other alphabets', () => {
  it.each([
    ['Cyrillic', 'МАЙЯ', 'Привет.'],
    ['Greek', 'ΜΑΙΡΗ', 'Γεια σου.'],
    ['CJK', '美雅', '你好。'],
    ['Arabic', 'مايا', 'مرحبا.'],
    ['Hebrew', 'יעל', 'שלום.'],
  ])('%s: a cue then its speech', (_name, cue, speech) => {
    expect(types(`${HEAD}${cue}\n${speech}\n`)).toEqual(['slug', 'character', 'dialogue']);
    expect(parseScript(`${HEAD}${cue}\n${speech}\n`).scenes[0].characters).toEqual([cue]);
  });

  it('a punctuated line in an uncased script is a sentence, not a cue', () => {
    expect(types(HEAD + '她走进房间。\n')).toEqual(['slug', 'action']);
  });

  it('an uncased line with no line under it is not a cue', () => {
    expect(types(HEAD + '美雅\n\nMaya waits.\n')).not.toContain('character');
  });

  it('Latin text is still judged by its capitals', () => {
    expect(types(HEAD + 'maya\nHello.\n')).toEqual(['slug', 'action', 'action']);
  });
});

describe('the title page keywords', () => {
  it('a line that merely contains "draft" is action', () => {
    expect(types('A cold draft blows through.\n\nINT. ROOM - DAY\n\nText.\n')).toEqual(['action', 'slug', 'action']);
  });

  it('a title-page line that STARTS with a keyword still is one', () => {
    expect(types('Draft 3, October 2026\n\nINT. ROOM - DAY\n\nText.\n')[0]).toBe('title');
    expect(types('Written by Ana\n\nINT. ROOM - DAY\n\nText.\n')[0]).toBe('title');
  });
});
