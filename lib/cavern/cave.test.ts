import { describe, expect, it } from 'vitest';
import { blendCaves, hash, makeCave, MIN_CLEARANCE, noise, seedOf, ZONE_LENGTH } from './cave';

const xs = Array.from({ length: 4000 }, (_, i) => -50 + i * 0.037);

describe('the cave', () => {
  it('is the same cave for the same seed, and a different one for another', () => {
    const a = makeCave(seedOf('track-1')), b = makeCave(seedOf('track-1')), c = makeCave(seedOf('track-2'));
    expect(xs.every((x) => a.floorAt(x) === b.floorAt(x) && a.ceilingAt(x) === b.ceilingAt(x))).toBe(true);
    expect(xs.some((x) => a.floorAt(x) !== c.floorAt(x))).toBe(true);
  });

  it('always leaves room to run: the ceiling is above the floor by at least the least clearance, and both stay on screen', () => {
    for (const s of ['a', 'b', 'c', 'night drive', 'running fast', '']) {
      const cave = makeCave(seedOf(s));
      for (const x of xs) {
        const f = cave.floorAt(x), c = cave.ceilingAt(x);
        expect(f - c).toBeGreaterThanOrEqual(MIN_CLEARANCE - 1e-9);
        expect(c).toBeGreaterThanOrEqual(0); expect(f).toBeLessThanOrEqual(1);
      }
    }
  });

  it('has no cliffs: the floor never jumps between neighbouring points', () => {
    const cave = makeCave(42);
    let worst = 0;
    for (let i = 1; i < xs.length; i++) worst = Math.max(worst, Math.abs(cave.floorAt(xs[i]) - cave.floorAt(xs[i - 1])) / (xs[i] - xs[i - 1]));
    expect(worst).toBeLessThan(2.5); // a steep tooth, never a wall
  });

  it('varies: over a long run it has several kinds of place, from a roomy chamber to a crawl', () => {
    const cave = makeCave(7);
    const kinds = new Set(Array.from({ length: 60 }, (_, i) => cave.zoneAt(i * ZONE_LENGTH + 1)));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    const gaps = xs.map((x) => cave.floorAt(x) - cave.ceilingAt(x));
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(0.25);
  });

  it('is the old cave before a change and the new one after, with no jump between', () => {
    const a = makeCave(1), b = makeCave(2), mixed = blendCaves(a, b, 100, 5);
    expect(mixed.floorAt(99)).toBe(a.floorAt(99));
    expect(mixed.floorAt(106)).toBe(b.floorAt(106));
    let worst = 0;
    for (let x = 99; x < 106; x += 0.01) worst = Math.max(worst, Math.abs(mixed.floorAt(x + 0.01) - mixed.floorAt(x)) / 0.01);
    expect(worst).toBeLessThan(3);
    for (let x = 98; x < 108; x += 0.05) expect(mixed.floorAt(x) - mixed.ceilingAt(x)).toBeGreaterThanOrEqual(MIN_CLEARANCE - 1e-9);
  });
});

describe('the numbers under it', () => {
  it('hash stays in [0, 1) and noise in [-1, 1]', () => {
    for (let i = 0; i < 500; i++) { const h = hash(i, 9); expect(h).toBeGreaterThanOrEqual(0); expect(h).toBeLessThan(1); expect(Math.abs(noise(i * 0.37, 3))).toBeLessThanOrEqual(1); }
  });
  it('seedOf is stable', () => { expect(seedOf('abc')).toBe(seedOf('abc')); expect(seedOf('abc')).not.toBe(seedOf('abd')); });
});
