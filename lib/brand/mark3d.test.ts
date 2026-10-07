import { describe, it, expect } from 'vitest';
import { ASSINIBOINE, RUNDLE, MOON, crescentOutline, mountainPositions, roughen, subdivide } from './mark3d';

describe('the 3D mark — mountains', () => {
  it('subdivides each face into 4^levels triangles', () => {
    expect(subdivide([[0, 0, 0], [1, 0, 0], [0, 1, 0]], 3)).toHaveLength(64);
    expect(mountainPositions(ASSINIBOINE, 3)).toHaveLength(4 * 64 * 9);
  });

  it('is the same every time (no cracks between faces, no flicker between renders)', () => {
    expect(Array.from(mountainPositions(RUNDLE))).toEqual(Array.from(mountainPositions(RUNDLE)));
  });

  it('keeps the base on the ground and the summit where it is', () => {
    expect(roughen([1, 0, 1], ASSINIBOINE.apex)).toEqual([1, 0, 1]);
    expect(roughen(ASSINIBOINE.apex, ASSINIBOINE.apex)).toEqual(ASSINIBOINE.apex);
    const p = mountainPositions(ASSINIBOINE);
    let top = -Infinity, bottom = Infinity;
    for (let i = 1; i < p.length; i += 3) { top = Math.max(top, p[i]); bottom = Math.min(bottom, p[i]); }
    expect(bottom).toBeCloseTo(0, 6);
    expect(top).toBeCloseTo(ASSINIBOINE.apex[1], 6);
  });

  it('Rundle stands taller than Assiniboine, as in the flat mark', () => {
    expect(RUNDLE.apex[1]).toBeGreaterThan(ASSINIBOINE.apex[1]);
    expect(RUNDLE.apex[0]).toBeGreaterThan(ASSINIBOINE.apex[0]);
  });
});

describe('the 3D mark — the crescent', () => {
  const pts = crescentOutline(32);
  const inMoon = ([x, y]: [number, number]) => Math.hypot(x, y) <= MOON.radius + 1e-6;
  const bite = { x: MOON.bite.dx * MOON.radius, y: MOON.bite.dy * MOON.radius, r: MOON.bite.r * MOON.radius };
  const outsideBite = ([x, y]: [number, number]) => Math.hypot(x - bite.x, y - bite.y) >= bite.r - 1e-6;

  it('lies inside the moon and outside the bite', () => {
    expect(pts.length).toBeGreaterThan(40);
    expect(pts.every(inMoon)).toBe(true);
    expect(pts.every(outsideBite)).toBe(true);
  });

  it('is lit on the side away from the bite (lower left)', () => {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    expect(cx).toBeLessThan(0);
    expect(cy).toBeLessThan(0);
  });

  it('never crosses itself (a simple polygon has a consistent signed area)', () => {
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      area += x1 * y2 - x2 * y1;
    }
    // A sliver of the disk, not zero and not more than the disk.
    const disk = Math.PI * MOON.radius ** 2;
    expect(Math.abs(area / 2)).toBeGreaterThan(disk * 0.15);
    expect(Math.abs(area / 2)).toBeLessThan(disk * 0.6);
  });
});
