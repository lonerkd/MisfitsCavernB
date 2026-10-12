import { describe, expect, it } from 'vitest';
import { byStoryDay, lookChangeText, lookChanges } from './continuity';

const scenes = [
  { id: 'a', scene_number: 1, story_day: 1 },
  { id: 'b', scene_number: 2, story_day: 1 },
  { id: 'c', scene_number: 3, story_day: 2 },
  { id: 'd', scene_number: 4, story_day: null },
  { id: 'e', scene_number: 5, story_day: 1 },
];
const st = (scene_id: string, character_id: string, look: string) => ({ scene_id, character_id, look });

describe('lookChanges', () => {
  it('flags a look that changes inside one story day', () => {
    const out = lookChanges(scenes, [st('a', 'maya', 'Red coat'), st('b', 'maya', 'Blue coat')]);
    expect(out).toEqual([{ character_id: 'maya', story_day: 1, from: { scene: 1, look: 'Red coat' }, to: { scene: 2, look: 'Blue coat' } }]);
  });
  it('does not flag a new story day, or the same look written differently', () => {
    expect(lookChanges(scenes, [st('b', 'maya', 'Red coat'), st('c', 'maya', 'Blue coat')])).toEqual([]);
    expect(lookChanges(scenes, [st('a', 'maya', 'Red  coat'), st('b', 'maya', ' red COAT ')])).toEqual([]);
  });
  it('skips scenes with no story day and empty looks, and compares the nearest looks around them', () => {
    expect(lookChanges(scenes, [st('a', 'maya', 'Red coat'), st('d', 'maya', 'Blue coat')])).toEqual([]);
    const out = lookChanges(scenes, [st('a', 'maya', 'Red coat'), st('b', 'maya', ''), st('e', 'maya', 'Blue coat')]);
    expect(out).toHaveLength(1);
    expect(out[0].to.scene).toBe(5);
  });
  it('keeps characters apart and orders by day then scene', () => {
    const out = lookChanges(scenes, [st('a', 'maya', 'x'), st('b', 'leo', 'x'), st('e', 'maya', 'y'), st('e', 'leo', 'x')]);
    expect(out.map((c) => c.character_id)).toEqual(['maya']);
  });
  it('reads as a sentence', () => {
    const [c] = lookChanges(scenes, [st('a', 'maya', 'Red coat'), st('b', 'maya', 'Blue coat')]);
    expect(lookChangeText('MAYA', c)).toBe('MAYA: scene 1 “Red coat” then scene 2 “Blue coat”, both on day 1.');
  });
});

describe('byStoryDay', () => {
  it('groups in story order with the undated last', () => {
    const g = byStoryDay([...scenes].reverse());
    expect(g.map((x) => [x.day, x.scenes.map((s) => s.scene_number)])).toEqual([[1, [1, 2, 5]], [2, [3]], [null, [4]]]);
  });
});
