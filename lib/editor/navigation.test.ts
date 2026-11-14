import { describe, it, expect } from 'vitest';
import { scenesForCharacter, sceneByNumber } from './navigation';

describe('editor navigation', () => {
  it('scenesForCharacter', () => {
    const scenes = [{ characters: ['MAYA', 'LEO'] }, { characters: ['LEO'] }, { characters: ['IVY'] }];
    expect(scenesForCharacter(scenes, 'leo')).toEqual([0, 1]);
  });
  it('sceneByNumber valid', () => expect(sceneByNumber([1, 2, 3], 2)).toBe(1));
  it('sceneByNumber invalid', () => expect(sceneByNumber([1, 2, 3], 5)).toBeNull());
});
