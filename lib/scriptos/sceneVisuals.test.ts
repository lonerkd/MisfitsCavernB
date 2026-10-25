import { describe, it, expect } from 'vitest';
import { getSceneType, sceneTypeColor, CARD_COLORS } from './sceneVisuals';
import type { ScriptLine } from '@/lib/scriptos/types';

describe('getSceneType', () => {
  it('returns isInt=true for INT scenes', () => {
    const scene = { text: 'INT. KITCHEN' } as ScriptLine;
    expect(getSceneType(scene).isInt).toBe(true);
  });

  it('returns isExt=true for EXT scenes', () => {
    const scene = { text: 'EXT. PARK' } as ScriptLine;
    expect(getSceneType(scene).isExt).toBe(true);
  });

  it('returns isDay=true for DAY scenes', () => {
    const scene = { text: 'INT. KITCHEN DAY' } as ScriptLine;
    expect(getSceneType(scene).isDay).toBe(true);
  });

  it('returns isNight=true for NIGHT scenes', () => {
    const scene = { text: 'INT. KITCHEN NIGHT' } as ScriptLine;
    expect(getSceneType(scene).isNight).toBe(true);
  });

  it('returns false for all flags when no keywords present', () => {
    const scene = { text: 'INT. KITCHEN' } as ScriptLine;
    expect(getSceneType(scene)).toEqual({ isInt: true, isExt: false, isDay: false, isNight: false });
  });

  it('returns isDay=true for MORNING scenes', () => {
    const scene = { text: 'INT. KITCHEN MORNING' } as ScriptLine;
    expect(getSceneType(scene).isDay).toBe(true);
  });

  it('returns isDay=true for AFTERNOON scenes', () => {
    const scene = { text: 'INT. KITCHEN AFTERNOON' } as ScriptLine;
    expect(getSceneType(scene).isDay).toBe(true);
  });

  it('returns isNight=true for DUSK scenes', () => {
    const scene = { text: 'EXT. PARK DUSK' } as ScriptLine;
    expect(getSceneType(scene).isNight).toBe(true);
  });

  it('returns isNight=true for DAWN scenes', () => {
    const scene = { text: 'INT. KITCHEN DAWN' } as ScriptLine;
    expect(getSceneType(scene).isNight).toBe(true);
  });
});

describe('sceneTypeColor', () => {
  it('returns #6366f1 for INT + DAY scenes', () => {
    const scene = { text: 'INT. KITCHEN DAY' } as ScriptLine;
    expect(sceneTypeColor(scene)).toBe('#6366f1');
  });

  it('returns #9194f6 for INT + NIGHT scenes', () => {
    const scene = { text: 'INT. KITCHEN NIGHT' } as ScriptLine;
    expect(sceneTypeColor(scene)).toBe('#9194f6');
  });

  it('returns #d97706 for EXT + DAY scenes', () => {
    const scene = { text: 'EXT. PARK DAY' } as ScriptLine;
    expect(sceneTypeColor(scene)).toBe('#d97706');
  });

  it('returns #92400e for EXT + NIGHT scenes', () => {
    const scene = { text: 'EXT. PARK NIGHT' } as ScriptLine;
    expect(sceneTypeColor(scene)).toBe('#92400e');
  });

  it('returns #7c3aed for INT scenes (no day/night)', () => {
    const scene = { text: 'INT. KITCHEN' } as ScriptLine;
    expect(sceneTypeColor(scene)).toBe('#7c3aed');
  });

  it('returns #b45309 for EXT scenes (no day/night)', () => {
    const scene = { text: 'EXT. PARK' } as ScriptLine;
    expect(sceneTypeColor(scene)).toBe('#b45309');
  });

  it('returns default color for unknown types', () => {
    const scene = { text: 'SOMETHING ELSE' } as ScriptLine;
    expect(sceneTypeColor(scene)).toBe('#4b5563');
  });
});

describe('CARD_COLORS', () => {
  it('has exactly 8 colors', () => {
    expect(CARD_COLORS.length).toBe(8);
  });

  it('all colors are valid hex strings', () => {
    CARD_COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('contains all expected card colors', () => {
    const expectedColors = ['#e8431a', '#0099ff', '#00cc66', '#ff6b9d', '#ffd43b', '#a855f7', '#f97316', '#06b6d4'];
    const cardColorsSet = new Set(CARD_COLORS);
    expectedColors.forEach(color => {
      expect(cardColorsSet.has(color)).toBe(true);
    });
  });
});

describe('getSceneType edge cases', () => {
  it('handles empty scene text gracefully', () => {
    const scene = { text: '' } as ScriptLine;
    const result = getSceneType(scene);
    expect(result.isInt).toBe(false);
    expect(result.isExt).toBe(false);
    expect(result.isDay).toBe(false);
    expect(result.isNight).toBe(false);
  });

  it('handles scene with only whitespace', () => {
    const scene = { text: '   ' } as ScriptLine;
    const result = getSceneType(scene);
    expect(result.isInt).toBe(false);
    expect(result.isExt).toBe(false);
    expect(result.isDay).toBe(false);
    expect(result.isNight).toBe(false);
  });

  it('handles scene with only keywords', () => {
    const scene = { text: 'INT' } as ScriptLine;
    const result = getSceneType(scene);
    expect(result.isInt).toBe(true);
    expect(result.isExt).toBe(false);
    expect(result.isDay).toBe(false);
    expect(result.isNight).toBe(false);
  });

  it('handles scene with multiple keywords', () => {
    const scene = { text: 'INT. KITCHEN DAY NIGHT' } as ScriptLine;
    const result = getSceneType(scene);
    expect(result.isInt).toBe(true);
    expect(result.isExt).toBe(false);
    expect(result.isDay).toBe(true);
    expect(result.isNight).toBe(true);
  });
});

describe('sceneTypeColor edge cases', () => {
  it('returns default color for empty scene text', () => {
    const scene = { text: '' } as ScriptLine;
    expect(sceneTypeColor(scene)).toBe('#4b5563');
  });

  it('returns correct color for INT scenes with day/night', () => {
    expect(sceneTypeColor({ text: 'INT. KITCHEN DAY' } as ScriptLine)).toBe('#6366f1');
    expect(sceneTypeColor({ text: 'INT. KITCHEN NIGHT' } as ScriptLine)).toBe('#9194f6');
  });

  it('returns correct color for EXT scenes with day/night', () => {
    expect(sceneTypeColor({ text: 'EXT. PARK DAY' } as ScriptLine)).toBe('#d97706');
    expect(sceneTypeColor({ text: 'EXT. PARK NIGHT' } as ScriptLine)).toBe('#92400e');
  });

  it('returns correct color for INT scenes without day/night', () => {
    expect(sceneTypeColor({ text: 'INT. KITCHEN' } as ScriptLine)).toBe('#7c3aed');
  });

  it('returns correct color for EXT scenes without day/night', () => {
    expect(sceneTypeColor({ text: 'EXT. PARK' } as ScriptLine)).toBe('#b45309');
  });

  it('handles scene with only INT keyword', () => {
    expect(sceneTypeColor({ text: 'INT' } as ScriptLine)).toBe('#7c3aed');
  });

  it('handles scene with only EXT keyword', () => {
    expect(sceneTypeColor({ text: 'EXT' } as ScriptLine)).toBe('#b45309');
  });
});
