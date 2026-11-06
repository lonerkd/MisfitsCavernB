import { describe, expect, it } from 'vitest';
import { clampPoint, dominantColours, nextSpot, templateSeed, isTemplate, TEMPLATE_INFO, BOARD_TEMPLATES } from './boards';

describe('mood board geometry', () => {
  it('keeps a card on the board', () => {
    expect(clampPoint(-5, 120, 24)).toEqual({ x: 0, y: 95 });
    expect(clampPoint(90, 10, 24)).toEqual({ x: 76, y: 10 });
    expect(clampPoint(10, 10, 24)).toEqual({ x: 10, y: 10 });
  });

  it('puts new cards in free slots instead of on top of each other', () => {
    const first = nextSpot([]);
    const second = nextSpot([{ ...first, w: 24 }]);
    const third = nextSpot([{ ...first, w: 24 }, { ...second, w: 24 }]);
    expect(new Set([`${first.x},${first.y}`, `${second.x},${second.y}`, `${third.x},${third.y}`]).size).toBe(3);
    for (const p of [first, second, third]) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x + 24).toBeLessThanOrEqual(100); }
  });

  it('wraps to a new row when a row is full', () => {
    const placed: Array<{ x: number; y: number; w: number }> = [];
    for (let i = 0; i < 5; i++) placed.push({ ...nextSpot(placed), w: 24 });
    expect(new Set(placed.map((p) => p.y)).size).toBeGreaterThan(1);
  });
});

describe('templates', () => {
  it('every template has a label, and only the free one starts empty', () => {
    for (const t of BOARD_TEMPLATES) { expect(TEMPLATE_INFO[t].label).toBeTruthy(); expect(templateSeed(t).length > 0).toBe(t !== 'free'); }
    expect(isTemplate('tone')).toBe(true);
    expect(isTemplate('villain')).toBe(false);
  });
  it('seeds note cards that fit on the board', () => {
    for (const t of BOARD_TEMPLATES) for (const c of templateSeed(t)) expect(c.x + c.w).toBeLessThanOrEqual(100);
  });
});

describe('dominantColours', () => {
  it('finds the most common colours, ignoring transparent pixels', () => {
    const px = (r: number, g: number, b: number, a = 255) => [r, g, b, a];
    const data = [...px(250, 10, 10), ...px(250, 10, 10), ...px(250, 10, 10), ...px(10, 10, 250), ...px(0, 255, 0, 0)];
    const out = dominantColours(data, 2);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatch(/^#f[0-9a-f]/);
    expect(out[1]).toMatch(/^#[0-9a-f]{4}f/i);
  });
  it('returns nothing for no pixels', () => { expect(dominantColours([])).toEqual([]); });
});
