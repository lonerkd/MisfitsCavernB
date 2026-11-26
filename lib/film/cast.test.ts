import { describe, it, expect } from 'vitest';
import { castByScene, castIdsByScene, castIdsOfScene, castOfScene } from './cast';

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

  it('keys the same cast by id, in the same name order as the names', () => {
    const links = [
      { scene_id: 's1', character_id: 'c1' }, { scene_id: 's1', character_id: 'c2' }, { scene_id: 's2', character_id: 'c3' },
    ];
    const byId = castIdsByScene(links, characters);
    // The names run ELI, MAYA — so the ids must run c2, c1: index i of one is index i of the other.
    expect(castIdsOfScene({ id: 's1' }, byId)).toEqual(['c2', 'c1']);
    expect(castIdsOfScene({ id: 's2' }, byId)).toEqual(['c3']);
    expect(castIdsOfScene({ id: 's9' }, byId)).toEqual([]);
    const byName = castByScene(links, characters);
    for (const [sceneId, ids] of byId) {
      expect(ids.map((id) => characters.find((c) => c.id === id)!.name.toUpperCase()).sort()).toEqual(byName.get(sceneId));
      expect(ids).toHaveLength(byName.get(sceneId)!.length);
    }
  });

  it('keeps two characters who share a name apart by id', () => {
    const twins = [{ id: 'c1', name: 'Sam' }, { id: 'c9', name: 'SAM' }];
    const byId = castIdsByScene([{ scene_id: 's1', character_id: 'c9' }, { scene_id: 's1', character_id: 'c1' }], twins);
    expect(new Set(castIdsOfScene({ id: 's1' }, byId))).toEqual(new Set(['c1', 'c9']));
  });
});
