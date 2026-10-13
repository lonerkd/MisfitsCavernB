import { describe, it, expect } from 'vitest';
import { castByScene, castFromText, castOfScene } from './cast';

const characters = [{ id: 'c1', name: 'Maya' }, { id: 'c2', name: 'ELI' }, { id: 'c3', name: 'Zed' }];

describe('who is in a scene', () => {
  it('reads the old text as upper-case names', () => {
    expect(castFromText('Maya, eli ,,')).toEqual(['MAYA', 'ELI']);
    expect(castFromText(null)).toEqual([]);
  });

  it('groups linked characters by scene, by name, upper-case', () => {
    const by = castByScene([
      { scene_id: 's1', character_id: 'c1' }, { scene_id: 's1', character_id: 'c2' }, { scene_id: 's2', character_id: 'c3' },
    ], characters);
    expect(by.get('s1')).toEqual(['ELI', 'MAYA']);
    expect(by.get('s2')).toEqual(['ZED']);
  });

  it('ignores a link to a character that is not known', () => {
    expect(castByScene([{ scene_id: 's1', character_id: 'gone' }], characters).size).toBe(0);
  });

  it('prefers the links; falls back to the text only for a scene with none', () => {
    const by = castByScene([{ scene_id: 's1', character_id: 'c1' }], characters);
    expect(castOfScene({ id: 's1', cast_list: 'OLD NAME' }, by)).toEqual(['MAYA']);
    expect(castOfScene({ id: 's9', cast_list: 'Eli' }, by)).toEqual(['ELI']);
  });
});
