import { describe, expect, it } from 'vitest';
import { characterName, sceneChip, sceneLabelFor, sceneOption, type LinkableScene } from './record-links';

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
});
