import { describe, expect, it } from 'vitest';
import { parseScript, type ParseContext } from './parser';
import { contextFromCastings, contextKey } from './context';

// B7 of the deep-brain plan: what the rest of the suite knows, as evidence for the reader.

const HEAD = 'INT. ROOM - DAY\n\n';
const read = (src: string, context?: ParseContext) => parseScript(src, 'screenplay', undefined, { context });
const types = (src: string, context?: ParseContext) => read(src, context).lines.filter((l) => l.type !== 'empty').map((l) => l.type);

describe('a known character is believed', () => {
  const LONG = 'THE OLD WOMAN WHO KEEPS THE LAMP AT NIGHT';

  it('a cue too long to look like a name is still a cue when the project has cast her', () => {
    const src = `${HEAD}${LONG}\nGood evening.\n`;
    expect(types(src)).toEqual(['slug', 'action', 'action']);
    expect(types(src, { characters: [LONG] })).toEqual(['slug', 'character', 'dialogue']);
    expect(read(src, { characters: [LONG] }).scenes[0].characters).toEqual([LONG]);
  });

  it('names are matched however they are written', () => {
    expect(types(`${HEAD}${LONG}\nGood evening.\n`, { characters: [`  ${LONG.toLowerCase()} `] })).toEqual(['slug', 'character', 'dialogue']);
  });

  it('knowing a name changes nothing about lines that are not that name', () => {
    const src = `${HEAD}MAYA\nHi.\n\nTHE DOOR EXPLODES.\nMaya ducks.\n`;
    expect(types(src, { characters: ['MAYA'] })).toEqual(types(src));
  });
});

describe('a rejected name is never a cue', () => {
  const SRC = `${HEAD}DARKNESS\nMaya waits.\n`;

  it('the Fountain rule says a caps line over prose is a cue; a person can say otherwise', () => {
    expect(types(SRC)).toEqual(['slug', 'character', 'dialogue']);
    expect(types(SRC, { rejectedNames: ['DARKNESS'] })).toEqual(['slug', 'action', 'action']);
    expect(read(SRC, { rejectedNames: ['DARKNESS'] }).scenes[0].characters).toEqual([]);
  });

  it('a rejection beats knowing the name', () => {
    expect(types(SRC, { characters: ['DARKNESS'], rejectedNames: ['DARKNESS'] })).toEqual(['slug', 'action', 'action']);
  });

  it('it is not counted as a speaker anywhere in the script', () => {
    const src = `${HEAD}DARKNESS\nMaya waits.\n\nMAYA\nHello.\n\nDARKNESS\nAgain.\n`;
    const r = read(src, { rejectedNames: ['DARKNESS'] });
    expect(r.characters.map((c) => c.name)).toEqual(['MAYA']);
  });
});

describe('the old line-by-line read honours the same context', () => {
  it('a known name raises a cue, a rejected one is not counted', () => {
    const SRC = `${HEAD}DARKNESS\nMaya waits.\n`;
    const old = (context?: ParseContext) => parseScript(SRC, 'screenplay', undefined, { decoder: false, context }).characters.map((c) => c.name);
    expect(old()).toContain('DARKNESS');
    expect(old({ rejectedNames: ['DARKNESS'] })).not.toContain('DARKNESS');
  });
});

describe('contextFromCastings', () => {
  it('collects the cast, upper-cased and without repeats, and passes rejections along', () => {
    expect(contextFromCastings([{ character_name: 'maya' }, { character_name: 'MAYA ' }, { character_name: 'Leo' }, { character_name: '  ' }], ['darkness']))
      .toEqual({ characters: ['MAYA', 'LEO'], rejectedNames: ['DARKNESS'] });
  });

  it('keys a context so a change can be noticed, and an empty one is stable', () => {
    expect(contextKey(undefined)).toBe('');
    expect(contextKey(contextFromCastings([{ character_name: 'MAYA' }]))).not.toBe(contextKey(contextFromCastings([{ character_name: 'LEO' }])));
    expect(contextKey(contextFromCastings([]))).toBe(contextKey(contextFromCastings([])));
  });

  it('an empty context changes nothing', () => {
    const src = `${HEAD}MAYA\nSTOP RIGHT THERE!\n\nTHE DOOR EXPLODES.\nMaya ducks.\n`;
    expect(types(src, contextFromCastings([]))).toEqual(types(src));
  });
});

describe('what the context must not do', () => {
  it('never changes where scenes begin', () => {
    const src = 'INT. ROOM - DAY\n\nMAYA\nHi.\n\nTHE LIGHTHOUSE - NIGHT\n\nBoats.\n\nEXT. PIER - DAY\n\nText.\n';
    const plain = read(src).scenes.map((s) => s.heading);
    const withContext = read(src, { characters: ['MAYA', 'THE LIGHTHOUSE'], rejectedNames: ['PIER'] }).scenes.map((s) => s.heading);
    expect(withContext).toEqual(plain);
  });
});

describe('human line overrides', () => {
  it('uses the override for the exact text occurrence, with confidence and explanation', () => {
    const src = `${HEAD}DARKNESS\nMaya waits.\n\nDARKNESS\nAgain.\n`;
    const result = read(src, {
      lineOverrides: [{ lineText: 'DARKNESS', occurrence: 1, type: 'action' }],
    });
    const darknessLines = result.lines.filter((line) => line.text === 'DARKNESS');
    expect(darknessLines.map((line) => line.type)).toEqual(['character', 'action']);
    expect(darknessLines[1]).toMatchObject({ confidence: 100, reasoning: 'Human line override' });
  });

  it('keeps Fountain-forced syntax authoritative over stored overrides', () => {
    const result = read(`${HEAD}@MAYA\nHi.\n`, {
      lineOverrides: [{ lineText: '@MAYA', occurrence: 0, type: 'action' }],
    });
    expect(result.lines.find((line) => line.text === '@MAYA')?.type).toBe('character');
  });
});
