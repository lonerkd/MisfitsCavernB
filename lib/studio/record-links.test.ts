import { describe, expect, it } from 'vitest';
import { characterName, recordsByScene, recordTotal, sceneChip, sceneLabelFor, sceneOption, scenesWithoutCharacter, type LinkableScene } from './record-links';

const sc = (id: string, n: number, heading: string | null = null, title = ''): LinkableScene => ({ id, scene_number: n, heading, title });
const scenes = new Map([sc('a', 12, 'INT. KITCHEN - DAY'), sc('b', 14, null, 'GARDEN'), sc('c', 3)].map((s) => [s.id, s]));

describe('record links', () => {
  it('names a scene for a picker by its number and heading, else its title, else its number', () => {
    expect(sceneOption(scenes.get('a')!)).toBe('12 · INT. KITCHEN - DAY');
    expect(sceneOption(scenes.get('b')!)).toBe('14 · GARDEN');
    expect(sceneOption(scenes.get('c')!)).toBe('3');
  });

  it('the label of linked scenes is their numbers in the order linked; unknown ids add nothing', () => {
    expect(sceneLabelFor(['b', 'a', 'zzz'], scenes)).toBe('14, 12');
    expect(sceneLabelFor([], scenes)).toBe('');
  });

  it('a chip shows the linked scenes, and falls back to the typed label when no link resolves', () => {
    expect(sceneChip({ scene_ids: ['a'], scene: 'old text' }, scenes)).toBe('12');
    expect(sceneChip({ scene_ids: ['gone'], scene: '12 (deleted)' }, scenes)).toBe('12 (deleted)');
    expect(sceneChip({ scenes: ' 1, 4 ' }, scenes)).toBe('1, 4');
    expect(sceneChip({}, scenes)).toBe('');
  });

  it('a character is the linked one’s current name (a rename shows), else the typed label', () => {
    const chars = new Map([['c1', { name: 'MAYA' }]]);
    expect(characterName({ character_id: 'c1', character: 'maya (old spelling)' }, chars)).toBe('MAYA');
    expect(characterName({ character_id: 'gone', character: 'Maya' }, chars)).toBe('Maya');
    expect(characterName({ character: ' Lead actress ' }, chars)).toBe('Lead actress');
  });

  it('counts, for each scene, the records linked to it by tool, in a fixed order', () => {
    const by = recordsByScene([
      { kind: 'makeup', scene_ids: ['a'] }, { kind: 'cameraReports', scene_ids: ['a', 'b'] }, { kind: 'cameraReports', scene_ids: ['a'] }, { kind: 'costumes', scene_ids: [] },
    ]);
    expect(by.get('a')).toEqual([{ kind: 'cameraReports', label: 'Camera reports', count: 2 }, { kind: 'makeup', label: 'Makeup', count: 1 }]);
    expect(by.get('b')).toEqual([{ kind: 'cameraReports', label: 'Camera reports', count: 1 }]);
    expect(by.has('c')).toBe(false);
    expect(recordTotal(by.get('a'))).toBe(3);
    expect(recordTotal(undefined)).toBe(0);
  });

  describe('a look for a scene the character is not in', () => {
    const chars = new Map([['c1', { name: 'Maya' }]]);
    const cast: Record<string, string[]> = { a: ['MAYA', 'ELI'], b: ['ELI'], c: [] };
    const castOf = (id: string) => cast[id] ?? [];
    it('names the linked scenes whose cast leaves the character out', () => {
      // Scene 12 has Maya; scene 14 (b) does not.
      expect(scenesWithoutCharacter({ scene_ids: ['a'], character_id: 'c1' }, scenes, chars, castOf)).toEqual([]);
      expect(scenesWithoutCharacter({ scene_ids: ['a', 'b'], character_id: 'c1' }, scenes, chars, castOf)).toEqual([14]);
    });
    it('judges nothing without a linked character, an unknown scene, or a scene whose cast is not known yet', () => {
      expect(scenesWithoutCharacter({ scene_ids: ['b'] }, scenes, chars, castOf)).toEqual([]);
      expect(scenesWithoutCharacter({ scene_ids: ['zzz'], character_id: 'c1' }, scenes, chars, castOf)).toEqual([]);
      expect(scenesWithoutCharacter({ scene_ids: ['c'], character_id: 'c1' }, scenes, chars, castOf)).toEqual([]);
      expect(scenesWithoutCharacter({ scene_ids: ['a'], character_id: 'gone' }, scenes, chars, castOf)).toEqual([]);
    });
  });
});
