import { describe, expect, it } from 'vitest';
import { parseScript } from './parser';
import { actStructure, filterScenes, reorderScenes, sceneAtCaret, sceneCharacters, sceneNumberFromInput, scenePositions, sceneWordCounts, stepScene } from './sceneviews';

const SRC = 'Title: X\n\nINT. KITCHEN - DAY\n\nMAYA\nHi there.\n\nEXT. STREET - NIGHT\n\nLEO\nHey.\n\nINT. HALL - DAY\n\nMaya waits.\n';
const lines = () => parseScript(SRC, 'screenplay').lines;
const headings = () => lines().filter((l) => l.type === 'slug');

describe('scene views', () => {
  it('finds each heading in the text', () => {
    const p = scenePositions(headings(), SRC);
    expect(p).toHaveLength(3);
    expect(p.map((i) => SRC.substring(i, i + 4))).toEqual(['INT.', 'EXT.', 'INT.']);
    expect(scenePositions([{ ...headings()[0], text: 'INT. NOWHERE' }], SRC)).toEqual([-1]);
  });

  it('moves a scene and keeps every other character of the script', () => {
    const next = reorderScenes(SRC, scenePositions(headings(), SRC), 2, 0)!;
    expect(next.indexOf('INT. HALL')).toBeLessThan(next.indexOf('INT. KITCHEN'));
    expect(next.length).toBe(SRC.length);
    expect(next.startsWith('Title: X')).toBe(true);
    expect([...next].sort().join('')).toBe([...SRC].sort().join(''));
  });

  it('refuses a move that is not one', () => {
    const p = scenePositions(headings(), SRC);
    expect(reorderScenes(SRC, p, 1, 1)).toBeNull();
    expect(reorderScenes(SRC, p, -1, 0)).toBeNull();
    expect(reorderScenes(SRC, p, 0, 9)).toBeNull();
    expect(reorderScenes(SRC, [3, -1], 0, 1)).toBeNull();
    expect(reorderScenes(SRC, [], 0, 1)).toBeNull();
  });

  it('filters by interior, exterior, day or night', () => {
    const h = headings();
    expect(filterScenes(h, 'all')).toHaveLength(3);
    expect(filterScenes(h, 'int')).toHaveLength(2);
    expect(filterScenes(h, 'ext')).toHaveLength(1);
    expect(filterScenes(h, 'night').map((s) => s.text)).toEqual(['EXT. STREET - NIGHT']);
    expect(filterScenes(h, 'day')).toHaveLength(2);
  });

  it('counts words and speakers per scene', () => {
    const l = lines();
    const h = l.filter((x) => x.type === 'slug'); // one parse: line ids are per parse
    expect(sceneCharacters(l, h)).toEqual([['MAYA'], ['LEO'], []]);
    const words = sceneWordCounts(l, h);
    expect(words).toHaveLength(3);
    expect(words[0]).toBeGreaterThan(words[2] - 1);
  });
});

describe('stepping through scenes and typing a scene number', () => {
  it('steps down and up, and stops at the ends', () => {
    expect(stepScene(0, 3, 1)).toBe(1);
    expect(stepScene(1, 3, -1)).toBe(0);
    expect(stepScene(2, 3, 1)).toBeNull(); // already the last scene
    expect(stepScene(0, 3, -1)).toBeNull(); // already the first scene
    expect(stepScene(0, 1, 1)).toBeNull(); // a one-scene script has nowhere to go
    expect(stepScene(0, 0, 1)).toBeNull();
  });

  it('steps into the script from before the first heading', () => {
    expect(stepScene(-1, 3, 1)).toBe(0); // down from the title page is scene 1
    expect(stepScene(-1, 3, -1)).toBe(2); // up from the title page is the last scene
    expect(stepScene(-1, 0, -1)).toBeNull();
  });

  it('accepts only a whole scene number inside the script', () => {
    expect(sceneNumberFromInput('1', 12)).toBe(1);
    expect(sceneNumberFromInput(' 12 ', 12)).toBe(12);
    expect(sceneNumberFromInput('13', 12)).toBeNull();
    expect(sceneNumberFromInput('0', 12)).toBeNull();
    expect(sceneNumberFromInput('', 12)).toBeNull();
    expect(sceneNumberFromInput('3a', 12)).toBeNull();
    expect(sceneNumberFromInput('1e3', 12)).toBeNull();
    expect(sceneNumberFromInput('2.5', 12)).toBeNull();
    expect(sceneNumberFromInput('-2', 12)).toBeNull();
    expect(sceneNumberFromInput('4', 0)).toBeNull();
  });
});

describe('scene at the caret and the acts', () => {
  it('finds the scene the caret line is in', () => {
    const l = lines();
    const h = l.filter((x) => x.type === 'slug');
    const at = (text: string) => l.findIndex((x) => x.text.includes(text));
    expect(sceneAtCaret(l, h, 0)).toBe(-1); // the title page, before any heading
    expect(sceneAtCaret(l, h, at('Hi there'))).toBe(0);
    expect(sceneAtCaret(l, h, at('Hey.'))).toBe(1);
    expect(sceneAtCaret(l, h, at('Maya waits'))).toBe(2);
    expect(sceneAtCaret(l, h, 9999)).toBe(2);
    expect(sceneAtCaret([], [], 0)).toBe(-1);
  });

  it('splits the acts near a quarter and three quarters of the words', () => {
    expect(actStructure([])).toEqual({ act1End: 0, act2End: 0, act2Start: 1, act3Start: 1 });
    expect(actStructure([10, 10, 10, 10, 10, 10, 10, 10])).toEqual({ act1End: 3, act2End: 7, act2Start: 4, act3Start: 8 });
    // a long opening scene pulls the first break earlier
    expect(actStructure([100, 10, 10, 10, 10, 10, 10, 10]).act1End).toBe(1);
  });
});
