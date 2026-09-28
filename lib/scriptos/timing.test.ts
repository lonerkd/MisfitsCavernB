import { describe, it, expect } from 'vitest';
import { eighthsOf, formatEighths, formatRuntime, printedLines, timeCharacters, timeScript, wrappedLines, type TimedLine } from './timing';

const L = (type: string, text = ''): TimedLine => ({ type, text });

describe('layout', () => {
  it('wraps each element at its own width', () => {
    const words = Array(20).fill('word').join(' '); // 99 characters
    expect(wrappedLines(words, 60)).toBe(2);
    expect(wrappedLines(words, 35)).toBe(3);
    expect(wrappedLines('', 60)).toBe(1);
  });

  it('dialogue takes more lines than the same words as action; notes don’t print; blank runs count once', () => {
    const text = Array(30).fill('said').join(' ');
    expect(printedLines([L('dialogue', text)])).toBeGreaterThan(printedLines([L('action', text)]));
    expect(printedLines([L('note', text), L('synopsis', text), L('section', '# Act')])).toBe(0);
    expect(printedLines([L('action', 'a'), L('empty'), L('empty'), L('empty'), L('action', 'b')])).toBe(3);
  });

  it('a scene is at least an eighth; a full page is 8/8', () => {
    expect(eighthsOf([L('slug', 'INT. CAVE - NIGHT')])).toBe(1);
    expect(eighthsOf(Array(55).fill(L('action', 'x')))).toBe(8);
  });
});

describe('runtime', () => {
  const scene = (heading: string, actionLines: number): TimedLine[] => [L('slug', heading), ...Array(actionLines - 1).fill(L('action', 'x'))];
  const script = [...scene('INT. A - DAY', 55), ...scene('EXT. B - NIGHT', 110)];

  it('estimates a minute a page, per scene', () => {
    const t = timeScript(script);
    expect(t.scenes.map((s) => Math.round(s.estimate))).toEqual([60, 120]);
    expect(t.pages).toBeCloseTo(3, 5);
    expect(t.calibration).toBe(1);
    expect(Math.round(t.runtime)).toBe(180);
  });

  it('a table read replaces the estimate and calibrates the unread scenes', () => {
    const t = timeScript(script, [90, null]);
    expect(t.scenes[0].runtime).toBe(90);
    expect(t.calibration).toBeCloseTo(1.5, 5);
    expect(Math.round(t.scenes[1].runtime)).toBe(180);
    expect(t.readScenes).toBe(1);
  });

  it('a nonsense read can’t swing the calibration wildly; the project’s pace scales the estimate', () => {
    expect(timeScript(script, [5000, null]).calibration).toBe(3);
    expect(Math.round(timeScript(script, [], 45).scenes[0].estimate)).toBe(45);
  });
});

describe('characters', () => {
  const lines: TimedLine[] = [
    L('slug', 'INT. CAVE - NIGHT'), L('character', 'MAYA'), L('dialogue', 'Who is there?'),
    L('character', 'DEV (O.S.)'), L('parenthetical', '(quietly)'), L('dialogue', 'Only me.'),
    L('slug', 'EXT. RIDGE - DAWN'), L('character', 'MAYA'), L('dialogue', 'You came back for me after all this time.'),
  ];
  it('counts speeches, words and scenes per speaker, extensions stripped', () => {
    const c = timeCharacters(lines);
    expect(c.map((x) => x.name)).toEqual(['MAYA', 'DEV']);
    expect(c[0]).toMatchObject({ speeches: 2, words: 12, scenes: 2, firstScene: 0 });
    expect(c[1]).toMatchObject({ speeches: 1, words: 2, scenes: 1 });
    expect(c[0].talkTime).toBeCloseTo(4.8, 5);
  });
});

describe('formatting', () => {
  it('reads like a script supervisor writes it', () => {
    expect(formatRuntime(5025)).toBe('1h 23m');
    expect(formatRuntime(95)).toBe('1m 35s');
    expect(formatRuntime(12)).toBe('12s');
    expect(formatEighths(11)).toBe('1 3/8');
    expect(formatEighths(4)).toBe('4/8');
    expect(formatEighths(16)).toBe('2');
  });
});
