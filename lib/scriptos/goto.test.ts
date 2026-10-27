import { describe, expect, it } from 'vitest';
import { lineOffset, resolveGoTo, speakingCast, type GoToContext } from './goto';

const ctx = (over: Partial<GoToContext> = {}): GoToContext => ({
  sceneCount: 3,
  headings: ['INT. KITCHEN - DAY', 'EXT. STREET - NIGHT', 'INT. HALL - DAY'],
  pages: [
    { page: 1, scene: 0 },
    { page: 2, scene: 1 },
    { page: 3, scene: 3 },
  ],
  perScene: [['MAYA'], ['MAYA', 'LEO'], ['LEO']],
  currentScene: 0,
  ...over,
});

describe('speakingCast', () => {
  it('lists who speaks, in first-spoken order, with their scenes once each', () => {
    expect(speakingCast([['MAYA'], ['MAYA', 'LEO'], ['LEO', '  '], []])).toEqual([
      { name: 'MAYA', scenes: [0, 1] },
      { name: 'LEO', scenes: [1, 2] },
    ]);
  });

  it('is empty for a script with no dialogue', () => {
    expect(speakingCast([[], []])).toEqual([]);
  });
});

describe('go to: a scene number', () => {
  it('resolves a scene that exists, and labels it with its heading', () => {
    expect(resolveGoTo('2', ctx())).toEqual({ target: { kind: 'scene', scene: 2 }, label: 'EXT. STREET - NIGHT' });
  });

  it('falls back to "Scene n of m" when the heading is missing', () => {
    expect(resolveGoTo('3', ctx({ headings: [] }))).toEqual({ target: { kind: 'scene', scene: 3 }, label: 'Scene 3 of 3' });
  });

  it('refuses a number the script does not have', () => {
    expect(resolveGoTo('9', ctx())).toEqual({ problem: 'No scene 9 · 1 - 3' });
  });

  it('says what the box takes when empty', () => {
    expect(resolveGoTo('   ', ctx())).toEqual({ problem: '3 scenes · a number, p12, or a name' });
  });
});

describe('go to: a page', () => {
  it('accepts p12, p.12, pg12 and page 12', () => {
    for (const input of ['p2', 'p.2', 'pg2', 'page 2', 'Page  2']) {
      expect(resolveGoTo(input, ctx())).toEqual({ target: { kind: 'page', page: 2 }, label: 'Scene 1 · INT. KITCHEN - DAY' });
    }
  });

  it('says where a page before the first heading is', () => {
    expect(resolveGoTo('p1', ctx())).toEqual({ target: { kind: 'page', page: 1 }, label: 'before the first scene' });
  });

  it('refuses a page the script does not have', () => {
    expect(resolveGoTo('p9', ctx())).toEqual({ problem: 'No page 9 · 1 - 3' });
  });
});

describe('go to: a character', () => {
  it('takes the next scene of theirs after the caret, and counts them', () => {
    expect(resolveGoTo('maya', ctx())).toEqual({
      target: { kind: 'character', name: 'MAYA', scene: 1, index: 2, total: 2 },
      label: 'Scene 2 · MAYA',
    });
  });

  it('wraps to their first scene when the caret is past all of theirs', () => {
    expect(resolveGoTo('maya', ctx({ currentScene: 2 }))).toEqual({
      target: { kind: 'character', name: 'MAYA', scene: 0, index: 1, total: 2 },
      label: 'Scene 1 · MAYA',
    });
  });

  it('accepts a unique beginning of a name, in any case', () => {
    expect(resolveGoTo('le', ctx())).toMatchObject({ target: { kind: 'character', name: 'LEO' } });
  });

  it('asks for more when a beginning matches several people', () => {
    const two = ctx({ perScene: [['MAYA'], ["MAYA'S MOTHER"]] });
    expect(resolveGoTo('ma', two)).toEqual({ problem: "MAYA, MAYA'S MOTHER — keep typing" });
    expect(resolveGoTo('maya', two)).toMatchObject({ target: { kind: 'character', name: 'MAYA' } });
  });

  it('says when nothing matches, and never crashes on a script with no voices', () => {
    expect(resolveGoTo('front', ctx())).toEqual({ problem: 'No scene, page or character “front”' });
    expect(resolveGoTo('maya', ctx({ perScene: [[]] }))).toEqual({ problem: 'No scene, page or character “maya”' });
  });
});

describe('lineOffset', () => {
  const CONTENT = 'Title: X\n\nINT. KITCHEN - DAY\n\nMAYA\nHi.\n';
  it('finds the start of each line', () => {
    expect(lineOffset(CONTENT, 0)).toBe(0);
    expect(lineOffset(CONTENT, 2)).toBe(10);
    expect(lineOffset(CONTENT, 4)).toBe(30);
  });
  it('skips the carriage return of a CRLF script', () => {
    const crlf = 'Title: X\r\n\r\nINT. KITCHEN - DAY\r\n';
    expect(lineOffset(crlf, 2)).toBe(12);
  });
  it('clamps past the end', () => {
    expect(lineOffset(CONTENT, 99)).toBe(CONTENT.length);
  });
});
