import { describe, expect, it } from 'vitest';
import { clampPoint, dominantColours, nextSpot, templateSeed, isTemplate, TEMPLATE_INFO, BOARD_TEMPLATES, BOARD_ACCESS, BOARD_ACCESS_INFO, isBoardAccess, canEditBoard, pinPoint, numberPins, shareExpiryFromDays, shareExpiryState, SHARE_EXPIRY_CHOICES } from './boards';

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

describe('board access', () => {
  it('lets anyone edit an open board, and only people who shape the project edit the others', () => {
    expect(canEditBoard('open', false)).toBe(true);
    expect(canEditBoard('view', false)).toBe(false);
    expect(canEditBoard('private', false)).toBe(false);
    expect(canEditBoard('view', true)).toBe(true);
    expect(canEditBoard('private', true)).toBe(true);
  });
  it('knows its three levels, each with a label and a sentence', () => {
    for (const a of BOARD_ACCESS) { expect(isBoardAccess(a)).toBe(true); expect(BOARD_ACCESS_INFO[a].label).toBeTruthy(); expect(BOARD_ACCESS_INFO[a].blurb).toBeTruthy(); }
    expect(isBoardAccess('everyone')).toBe(false);
    expect(isBoardAccess(null)).toBe(false);
  });
});

describe('pins', () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };
  it('turns a click into a percentage of the card, rounded to a tenth', () => {
    expect(pinPoint(200, 100, rect)).toEqual({ x: 50, y: 50 });
    expect(pinPoint(103, 51, rect)).toEqual({ x: 1.5, y: 1 });
  });
  it('keeps a pin inside the card, and survives a card with no size', () => {
    expect(pinPoint(0, 0, rect)).toEqual({ x: 0, y: 0 });
    expect(pinPoint(900, 900, rect)).toEqual({ x: 100, y: 100 });
    expect(pinPoint(5, 5, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 50, y: 50 });
  });
  it('numbers pins oldest first, with a stable order for equal times', () => {
    const out = numberPins([
      { id: 'b', created_at: '2026-01-01T00:00:02Z' },
      { id: 'c', created_at: '2026-01-01T00:00:01Z' },
      { id: 'a', created_at: '2026-01-01T00:00:01Z' },
    ]);
    expect(out.map((p) => [p.id, p.n])).toEqual([['a', 1], ['c', 2], ['b', 3]]);
  });
});

describe('share link expiry', () => {
  const now = new Date('2026-11-27T12:00:00Z');
  it('has no expiry for "never" and a moment N days on otherwise', () => {
    expect(shareExpiryFromDays(null, now)).toBeNull();
    expect(shareExpiryFromDays(7, now)).toBe('2026-12-04T12:00:00.000Z');
    expect(SHARE_EXPIRY_CHOICES[0]).toEqual({ days: null, label: 'Never expires' });
  });
  it('reads a link as never, live or expired at a moment (an expiry exactly now is expired)', () => {
    expect(shareExpiryState(null, now)).toBe('never');
    expect(shareExpiryState(undefined, now)).toBe('never');
    expect(shareExpiryState('2026-11-28T00:00:00Z', now)).toBe('live');
    expect(shareExpiryState('2026-11-27T12:00:00Z', now)).toBe('expired');
    expect(shareExpiryState('2026-11-01T00:00:00Z', now)).toBe('expired');
    expect(shareExpiryState('not a date', now)).toBe('never');
  });
});
