import { describe, it, expect } from 'vitest';
import { getSceneType, sceneTypeColor, CARD_COLORS } from './sceneVisuals';
import type { ScriptLine } from '@/lib/scriptos/types';

describe('sceneVisuals', () => {
  it('exports CARD_COLORS with exactly 8 color values', () => {
    expect(CARD_COLORS).toHaveLength(8);
    expect(CARD_COLORS).toEqual([
      '#e8431a',
      '#0099ff',
      '#00cc66',
      '#ff6b9d',
      '#ffd43b',
      '#a855f7',
      '#f97316',
      '#06b6d4'
    ]);
  });

  it('correctly determines scene type for INT scenes', () => {
    const scene: ScriptLine = { id: '1', index: 0, text: 'INT. OFFICE', type: 'scene', confidence: 1 };
    expect(getSceneType(scene)).toEqual({ isInt: true, isExt: false, isDay: false, isNight: false });
  });

  it('correctly determines scene type for EXT scenes', () => {
    const scene: ScriptLine = { id: '2', index: 1, text: 'EXT. PARK', type: 'scene', confidence: 1 };
    expect(getSceneType(scene)).toEqual({ isInt: false, isExt: true, isDay: false, isNight: false });
  });

  it('correctly determines scene type for INT DAY scenes', () => {
    const scene: ScriptLine = { id: '3', index: 2, text: 'INT. DAY', type: 'scene', confidence: 1 };
    expect(getSceneType(scene)).toEqual({ isInt: true, isExt: false, isDay: true, isNight: false });
  });

  it('correctly determines scene type for EXT DAY scenes', () => {
    const scene: ScriptLine = { id: '4', index: 3, text: 'EXT. AFTERNOON', type: 'scene', confidence: 1 };
    expect(getSceneType(scene)).toEqual({ isInt: false, isExt: true, isDay: true, isNight: false });
  });

  it('correctly determines scene type for INT NIGHT scenes', () => {
    const scene: ScriptLine = { id: '5', index: 4, text: 'INT. NIGHT', type: 'scene', confidence: 1 };
    expect(getSceneType(scene)).toEqual({ isInt: true, isExt: false, isDay: false, isNight: true });
  });

  it('correctly determines scene type for EXT NIGHT scenes', () => {
    const scene: ScriptLine = { id: '6', index: 5, text: 'EXT. DUSK', type: 'scene', confidence: 1 };
    expect(getSceneType(scene)).toEqual({ isInt: false, isExt: true, isDay: false, isNight: true });
  });

  it('correctly determines scene type for INT MORNING scenes', () => {
    const scene: ScriptLine = { id: '7', index: 6, text: 'INT. MORNING', type: 'scene', confidence: 1 };
    expect(getSceneType(scene)).toEqual({ isInt: true, isExt: false, isDay: true, isNight: false });
  });

  it('correctly determines scene type for INT DAWN scenes', () => {
    const scene: ScriptLine = { id: '8', index: 7, text: 'INT. DAWN', type: 'scene', confidence: 1 };
    expect(getSceneType(scene)).toEqual({ isInt: true, isExt: false, isDay: false, isNight: true });
  });

  it('returns #6366f1 for INT DAY scenes', () => {
    const scene: ScriptLine = { id: '3', index: 2, text: 'INT. DAY', type: 'scene', confidence: 1 };
    expect(sceneTypeColor(scene)).toBe('#6366f1');
  });

  it('returns #9194f6 for INT NIGHT scenes', () => {
    const scene: ScriptLine = { id: '5', index: 4, text: 'INT. NIGHT', type: 'scene', confidence: 1 };
    expect(sceneTypeColor(scene)).toBe('#9194f6');
  });

  it('returns #7c3aed for plain INT scenes (no day/night)', () => {
    const scene: ScriptLine = { id: '9', index: 8, text: 'INT. OFFICE', type: 'scene', confidence: 1 };
    expect(sceneTypeColor(scene)).toBe('#7c3aed');
  });

  it('returns #d97706 for EXT DAY scenes', () => {
    const scene: ScriptLine = { id: '4', index: 3, text: 'EXT. AFTERNOON', type: 'scene', confidence: 1 };
    expect(sceneTypeColor(scene)).toBe('#d97706');
  });

  it('returns #92400e for EXT NIGHT scenes', () => {
    const scene: ScriptLine = { id: '6', index: 5, text: 'EXT. DUSK', type: 'scene', confidence: 1 };
    expect(sceneTypeColor(scene)).toBe('#92400e');
  });

  it('returns #b45309 for plain EXT scenes (no day/night)', () => {
    const scene: ScriptLine = { id: '10', index: 9, text: 'EXT. STREET', type: 'scene', confidence: 1 };
    expect(sceneTypeColor(scene)).toBe('#b45309');
  });

  it('returns #4b5563 for scenes with empty or invalid text (fallback color)', () => {
    const scene: ScriptLine = { id: '11', index: 10, text: '???', type: 'scene', confidence: 1 };
    expect(sceneTypeColor(scene)).toBe('#4b5563');
  });

  it('returns #4b5563 for empty string text (fallback color)', () => {
    const scene: ScriptLine = { id: '12', index: 11, text: '', type: 'scene', confidence: 1 };
    expect(sceneTypeColor(scene)).toBe('#4b5563');
  });

  it('returns #4b5563 for undefined text (fallback color)', () => {
    const scene: ScriptLine = { id: '13', index: 12, text: '???', type: 'scene', confidence: 1 };
    expect(sceneTypeColor(scene)).toBe('#4b5563');
  });
});