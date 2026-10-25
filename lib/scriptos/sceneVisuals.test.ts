import { describe, it, expect } from 'vitest';
import { CARD_COLORS, getSceneType, sceneTypeColor } from './sceneVisuals';

describe('CARD_COLORS', () => {
  it('should export an array of color strings', () => {
    expect(CARD_COLORS).toBeInstanceOf(Array);
    expect(CARD_COLORS.length).toBeGreaterThan(0);
  });
});

describe('getSceneType', () => {
  it('should detect INT scene type', () => {
    const scene = { text: 'INT. KITCHEN - DAY' };
    const result = getSceneType(scene);
    expect(result.isInt).toBe(true);
    expect(result.isExt).toBe(false);
  });

  it('should detect EXT scene type', () => {
    const scene = { text: 'EXT. PARK - NIGHT' };
    const result = getSceneType(scene);
    expect(result.isInt).toBe(false);
    expect(result.isExt).toBe(true);
  });

  it('should detect DAY scene type', () => {
    const scene = { text: 'INT. KITCHEN - DAY' };
    const result = getSceneType(scene);
    expect(result.isDay).toBe(true);
  });

  it('should detect NIGHT scene type', () => {
    const scene = { text: 'EXT. PARK - NIGHT' };
    const result = getSceneType(scene);
    expect(result.isNight).toBe(true);
  });

  it('should handle MORNING as day', () => {
    const scene = { text: 'INT. KITCHEN - MORNING' };
    const result = getSceneType(scene);
    expect(result.isDay).toBe(true);
  });

  it('should handle AFTERNOON as day', () => {
    const scene = { text: 'INT. KITCHEN - AFTERNOON' };
    const result = getSceneType(scene);
    expect(result.isDay).toBe(true);
  });

  it('should handle DUSK as night', () => {
    const scene = { text: 'EXT. PARK - DUSK' };
    const result = getSceneType(scene);
    expect(result.isNight).toBe(true);
  });

  it('should handle DAWN as night', () => {
    const scene = { text: 'EXT. PARK - DAWN' };
    const result = getSceneType(scene);
    expect(result.isNight).toBe(true);
  });
});

describe('sceneTypeColor', () => {
  it('should return INT+DAY color', () => {
    const scene = { text: 'INT. KITCHEN - DAY' };
    const color = sceneTypeColor(scene);
    expect(color).toBe('#6366f1');
  });

  it('should return INT+NIGHT color', () => {
    const scene = { text: 'INT. KITCHEN - NIGHT' };
    const color = sceneTypeColor(scene);
    expect(color).toBe('#9194f6');
  });

  it('should return EXT+DAY color', () => {
    const scene = { text: 'EXT. PARK - DAY' };
    const color = sceneTypeColor(scene);
    expect(color).toBe('#d97706');
  });

  it('should return EXT+NIGHT color', () => {
    const scene = { text: 'EXT. PARK - NIGHT' };
    const color = sceneTypeColor(scene);
    expect(color).toBe('#92400e');
  });

  it('should return INT (no day/night) color', () => {
    const scene = { text: 'INT. KITCHEN' };
    const color = sceneTypeColor(scene);
    expect(color).toBe('#7c3aed');
  });

  it('should return EXT (no day/night) color', () => {
    const scene = { text: 'EXT. PARK' };
    const color = sceneTypeColor(scene);
    expect(color).toBe('#b45309');
  });

  it('should return default color for unknown type', () => {
    const scene = { text: 'SOME TEXT' };
    const color = sceneTypeColor(scene);
    expect(color).toBe('#4b5563');
  });
});
