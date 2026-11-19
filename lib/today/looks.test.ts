import { describe, expect, it } from 'vitest';
import { isLookCraft, lookDay, type LookDayInput } from './looks';

const base: LookDayInput = {
  today: '2026-11-19',
  day: { day_number: 2, shoot_date: '2026-11-21' },
  scenes: [
    { id: 'a', scene_number: 1, title: 'KITCHEN', story_day: 1, shoot_day: 1 },
    { id: 'b', scene_number: 2, title: 'PIER', story_day: 1, shoot_day: 2 },
    { id: 'c', scene_number: 3, title: 'GARAGE', story_day: 2, shoot_day: 2 },
  ],
  characters: [{ id: 'maya', name: 'MAYA' }, { id: 'ben', name: 'BEN' }],
  sceneCharacters: [{ scene_id: 'a', character_id: 'maya' }, { scene_id: 'b', character_id: 'maya' }, { scene_id: 'b', character_id: 'ben' }, { scene_id: 'c', character_id: 'ben' }],
  states: [{ scene_id: 'a', character_id: 'maya', look: 'Red coat' }, { scene_id: 'b', character_id: 'maya', look: 'Blue coat' }],
};

describe('lookDay', () => {
  it('lists each scene of the day with its characters’ looks, and what is missing', () => {
    const d = lookDay(base);
    expect(d.inDays).toBe(2);
    expect(d.scenes.map((s) => [s.scene_number, s.looks])).toEqual([
      [2, [{ character: 'BEN', look: '' }, { character: 'MAYA', look: 'Blue coat' }]],
      [3, [{ character: 'BEN', look: '' }]],
    ]);
    expect(d.attention).toContain('2 looks are not written down yet');
  });
  it('warns of a look change inside one story day when one of its scenes shoots that day', () => {
    const d = lookDay(base);
    expect(d.attention).toContain('Look change: MAYA: scene 1 “Red coat” then scene 2 “Blue coat”, both on day 1.');
  });
  it('says so when nothing is scheduled, and stays quiet when everything is noted', () => {
    expect(lookDay({ ...base, scenes: [] }).attention).toEqual(['Nothing is scheduled on this day yet']);
    const full = lookDay({ ...base, states: [{ scene_id: 'a', character_id: 'maya', look: 'Red coat' }, { scene_id: 'b', character_id: 'maya', look: 'Red coat' }, { scene_id: 'b', character_id: 'ben', look: 'Grey hoodie' }, { scene_id: 'c', character_id: 'ben', look: 'Grey hoodie' }] });
    expect(full.attention).toEqual([]);
  });
  it('files a scene with no shoot day under day 1, as the rest of the Studio does', () => {
    const d = lookDay({ ...base, day: { day_number: 1, shoot_date: '2026-11-20' }, scenes: base.scenes.map((x) => (x.id === 'a' ? { ...x, shoot_day: null } : x)) });
    expect(d.scenes.map((x) => x.scene_number)).toEqual([1]);
  });
  it('knows the looks crafts', () => {
    expect(['Costume designer', 'Makeup artist', 'Hair stylist', 'Wardrobe assistant'].every(isLookCraft)).toBe(true);
    expect(isLookCraft('Gaffer')).toBe(false);
    expect(isLookCraft(null)).toBe(false);
  });
});
