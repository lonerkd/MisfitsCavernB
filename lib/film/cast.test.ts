import { describe, it, expect } from 'vitest';
import { castByScene, castOfScene } from './cast';

const characters = [{ id: 'c1', name: 'Maya' }, { id: 'c2', name: 'ELI' }, { id: 'c3', name: 'Zed' }];

describe('who is in a scene', () => {
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

  it('reads the links; a scene with none has no cast', () => {
    const by = castByScene([{ scene_id: 's1', character_id: 'c1' }], characters);
    expect(castOfScene({ id: 's1' }, by)).toEqual(['MAYA']);
    expect(castOfScene({ id: 's9' }, by)).toEqual([]);
  });
});
