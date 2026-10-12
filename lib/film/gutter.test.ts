import { describe, expect, it } from 'vitest';
import { gutterLabel, sceneGutter, type GutterRow } from './gutter';

const scenes = [
  { heading: 'INT. KITCHEN - NIGHT', startIndex: 0 },
  { heading: 'INT. KITCHEN - NEXT MORNING', startIndex: 6 },
  { heading: 'EXT. PIER - DAY', startIndex: 12 },
];
const row = (extra: Partial<GutterRow> = {}): GutterRow => ({ story_day: null, story_time: null, story_confirmed: false, shoot_day: null, ...extra });

describe('sceneGutter', () => {
  it('reads story day and time from the headings when nothing is saved yet', () => {
    const g = sceneGutter(scenes, [null, null, null]);
    expect(g.map((x) => [x.line, x.day, x.time, x.shoot, x.guessed])).toEqual([
      [0, 1, 'night', null, true], [6, 2, 'morning', null, true], [12, 2, 'day', null, true],
    ]);
  });

  it('shows the shoot day once a scene is scheduled, and keeps a person’s story time', () => {
    const g = sceneGutter(scenes, [row({ shoot_day: 1 }), row({ story_day: 9, story_time: 'dawn', story_confirmed: true, shoot_day: 3 }), row({ shoot_day: 3 })], new Set([3]));
    expect(g[1]).toMatchObject({ line: 6, day: 9, time: 'dawn', shoot: 3, guessed: false });
    expect(g[2]).toMatchObject({ day: 9, shoot: 3, guessed: true });
  });

  it('does not call a scene scheduled just because it sits on day 1, or on a day with no date', () => {
    const g = sceneGutter(scenes, [row({ shoot_day: 1 }), row({ shoot_day: 2 }), row({ shoot_day: 3 })], new Set([3]));
    expect(g.map((x) => x.shoot)).toEqual([null, null, 3]);
    expect(sceneGutter(scenes, [row({ shoot_day: 1 }), null, null]).every((x) => x.shoot === null)).toBe(true);
  });

  it('gives a scene with no clues day 1, and nothing for no scenes', () => {
    expect(sceneGutter([{ heading: 'INT. ROOM', startIndex: 0 }], [null])).toEqual([{ line: 0, day: 1, time: null, shoot: null, guessed: true }]);
    expect(sceneGutter([], [])).toEqual([]);
  });

  it('puts flashbacks off the line', () => {
    const g = sceneGutter([{ heading: 'INT. A - DAY', startIndex: 0 }, { heading: 'INT. B - FLASHBACK - NIGHT', startIndex: 5 }], [null, null]);
    expect(g[1]).toMatchObject({ day: null, time: 'night' });
  });

  it('uses the stored time of day when the heading has none', () => {
    const g = sceneGutter([{ heading: 'INT. ROOM', startIndex: 0 }], [row({ time_of_day: 'NIGHT' })]);
    expect(g[0].time).toBe('night');
  });
});

describe('gutterLabel', () => {
  it('reads as words, and says when it is read from the script', () => {
    expect(gutterLabel({ line: 0, day: 2, time: 'morning', shoot: 3, guessed: true })).toBe('story day 2, morning, shoot day 3 (read from the script)');
    expect(gutterLabel({ line: 0, day: 2, time: null, shoot: null, guessed: false })).toBe('story day 2');
    expect(gutterLabel({ line: 0, day: null, time: null, shoot: 4, guessed: true })).toBe('shoot day 4');
  });
});
