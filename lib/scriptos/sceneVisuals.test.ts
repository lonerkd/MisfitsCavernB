import { describe, it, expect } from 'vitest';
import { getSceneType, sceneTypeColor, CARD_COLORS } from './sceneVisuals';
import type { ScriptLine } from '@/lib/scriptos/types';

const makeScriptLine = (text: string): ScriptLine => ({
  id: 'test',
  index: 0,
  text,
  type: 'scene' as const,
  confidence: 1.0,
});

describe('getSceneType', () => {
  it('returns isInt=true for INT scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN');
    const result = getSceneType(scene);
    expect(result.isInt).toBe(true);
  });

  it('returns isExt=true for EXT scenes', () => {
    const scene: ScriptLine = makeScriptLine('EXT PARK');
    const result = getSceneType(scene);
    expect(result.isExt).toBe(true);
  });

  it('returns isDay=true for DAY scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN DAY');
    const result = getSceneType(scene);
    expect(result.isDay).toBe(true);
  });

  it('returns isNight=true for NIGHT scenes', () => {
    const scene: ScriptLine = makeScriptLine('EXT PARK NIGHT');
    const result = getSceneType(scene);
    expect(result.isNight).toBe(true);
  });

  it('returns isDay=true for MORNING scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN MORNING');
    const result = getSceneType(scene);
    expect(result.isDay).toBe(true);
  });

  it('returns isNight=true for DUSK scenes', () => {
    const scene: ScriptLine = makeScriptLine('EXT PARK DUSK');
    const result = getSceneType(scene);
    expect(result.isNight).toBe(true);
  });

  it('returns isDay=true for AFTERNOON scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN AFTERNOON');
    const result = getSceneType(scene);
    expect(result.isDay).toBe(true);
  });

  it('returns isNight=true for DAWN scenes', () => {
    const scene: ScriptLine = makeScriptLine('EXT PARK DAWN');
    const result = getSceneType(scene);
    expect(result.isNight).toBe(true);
  });

});

describe('sceneTypeColor', () => {
  it('returns a color for INT scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN');
    const color = sceneTypeColor(scene);
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
  });

  it('returns a color for EXT scenes', () => {
    const scene: ScriptLine = makeScriptLine('EXT PARK');
    const color = sceneTypeColor(scene);
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
  });

  it('returns a color for DAY scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN DAY');
    const color = sceneTypeColor(scene);
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
  });

  it('returns a color for NIGHT scenes', () => {
    const scene: ScriptLine = makeScriptLine('EXT PARK NIGHT');
    const color = sceneTypeColor(scene);
    expect(typeof color).toBe('string');
    expect(color.length).toBeGreaterThan(0);
  });

});

describe('CARD_COLORS', () => {
  it('is an array of strings', () => {
    expect(Array.isArray(CARD_COLORS)).toBe(true);
  });

  it('has at least one color', () => {
    expect(CARD_COLORS.length).toBeGreaterThan(0);
  });

  it('all elements are non-empty strings', () => {
    for (const color of CARD_COLORS) {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    }
  });

  it('has at least 4 colors', () => {
    expect(CARD_COLORS.length).toBeGreaterThanOrEqual(4);
  });

  it('has exactly 8 colors', () => {
    expect(CARD_COLORS.length).toBe(8);
  });

  it('all colors are valid hex format', () => {
    for (const color of CARD_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

});

describe('sceneTypeColor edge cases', () => {
  it('returns a valid hex color for INT scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN');
    const color = sceneTypeColor(scene);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns a valid hex color for EXT scenes', () => {
    const scene: ScriptLine = makeScriptLine('EXT PARK');
    const color = sceneTypeColor(scene);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns a valid hex color for INT DAY scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN DAY');
    const color = sceneTypeColor(scene);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns a valid hex color for EXT NIGHT scenes', () => {
    const scene: ScriptLine = makeScriptLine('EXT PARK NIGHT');
    const color = sceneTypeColor(scene);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('returns a consistent color for the same scene type', () => {
    const scene1: ScriptLine = makeScriptLine('INT KITCHEN');
    const scene2: ScriptLine = makeScriptLine('INT BEDROOM');
    expect(sceneTypeColor(scene1)).toBe(sceneTypeColor(scene2));
  });

  it('returns a consistent color for INT scenes regardless of location', () => {
    const scene1: ScriptLine = makeScriptLine('INT KITCHEN');
    const scene2: ScriptLine = makeScriptLine('INT BEDROOM');
    const scene3: ScriptLine = makeScriptLine('INT HALLWAY');
    expect(sceneTypeColor(scene1)).toBe(sceneTypeColor(scene2));
    expect(sceneTypeColor(scene2)).toBe(sceneTypeColor(scene3));
  });

  it('returns a consistent color for EXT scenes regardless of location', () => {
    const scene1: ScriptLine = makeScriptLine('EXT PARK');
    const scene2: ScriptLine = makeScriptLine('EXT STREET');
    const scene3: ScriptLine = makeScriptLine('EXT FOREST');
    expect(sceneTypeColor(scene1)).toBe(sceneTypeColor(scene2));
    expect(sceneTypeColor(scene2)).toBe(sceneTypeColor(scene3));
  });

  it('INT and EXT scenes return different colors', () => {
    const intScene: ScriptLine = makeScriptLine('INT KITCHEN');
    const extScene: ScriptLine = makeScriptLine('EXT PARK');
    expect(sceneTypeColor(intScene)).not.toBe(sceneTypeColor(extScene));
  });

});

describe('getSceneType', () => {
  it('returns correct type for INT scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN');
    const result = getSceneType(scene);
    expect(result.isInt).toBe(true);
    expect(result.isExt).toBe(false);
    expect(result.isDay).toBe(false);
    expect(result.isNight).toBe(false);
  });

  it('returns correct type for EXT scenes', () => {
    const scene: ScriptLine = makeScriptLine('EXT PARK');
    const result = getSceneType(scene);
    expect(result.isInt).toBe(false);
    expect(result.isExt).toBe(true);
    expect(result.isDay).toBe(false);
    expect(result.isNight).toBe(false);
  });

  it('returns correct type for INT DAY scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN DAY');
    const result = getSceneType(scene);
    expect(result.isInt).toBe(true);
    expect(result.isExt).toBe(false);
    expect(result.isDay).toBe(true);
    expect(result.isNight).toBe(false);
  });

  it('returns correct type for INT NIGHT scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN NIGHT');
    const result = getSceneType(scene);
    expect(result.isInt).toBe(true);
    expect(result.isExt).toBe(false);
    expect(result.isDay).toBe(false);
    expect(result.isNight).toBe(true);
  });

  it('returns correct type for EXT DAY scenes', () => {
    const scene: ScriptLine = makeScriptLine('EXT PARK DAY');
    const result = getSceneType(scene);
    expect(result.isInt).toBe(false);
    expect(result.isExt).toBe(true);
    expect(result.isDay).toBe(true);
    expect(result.isNight).toBe(false);
  });

  it('returns correct type for EXT NIGHT scenes', () => {
    const scene: ScriptLine = makeScriptLine('EXT PARK NIGHT');
    const result = getSceneType(scene);
    expect(result.isInt).toBe(false);
    expect(result.isExt).toBe(true);
    expect(result.isDay).toBe(false);
    expect(result.isNight).toBe(true);
  });

  it('returns correct type for MORNING scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN MORNING');
    const result = getSceneType(scene);
    expect(result.isInt).toBe(true);
    expect(result.isExt).toBe(false);
    expect(result.isDay).toBe(true);
    expect(result.isNight).toBe(false);
  });

  it('returns correct type for AFTERNOON scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN AFTERNOON');
    const result = getSceneType(scene);
    expect(result.isInt).toBe(true);
    expect(result.isExt).toBe(false);
    expect(result.isDay).toBe(true);
    expect(result.isNight).toBe(false);
  });

  it('returns correct type for DUSK scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN DUSK');
    const result = getSceneType(scene);
    expect(result.isInt).toBe(true);
    expect(result.isExt).toBe(false);
    expect(result.isDay).toBe(false);
    expect(result.isNight).toBe(true);
  });

  it('returns correct type for DAWN scenes', () => {
    const scene: ScriptLine = makeScriptLine('INT KITCHEN DAWN');
    const result = getSceneType(scene);
    expect(result.isInt).toBe(true);
    expect(result.isExt).toBe(false);
    expect(result.isDay).toBe(false);
    expect(result.isNight).toBe(true);
  });

});
