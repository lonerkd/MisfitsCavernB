import { describe, it, expect } from 'vitest';
import { ASSINIBOINE, RUNDLE, MOON, crescentOutline, mountainPositions, roughen, subdivide, type Vec3 } from './mark3d';

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

type Tri = [Vec3, Vec3, Vec3];

// Half the length of the cross product of two edges: a triangle's area in 3D.
function area([a, b, c]: Tri): number {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
}

// A flat-to-the-eye, non-axis-aligned triangle so every axis is exercised.
const TRI: Tri = [[0, 0, 0], [4, 0, 1], [1, 3, 2]];
const key = (v: Vec3) => v.join(',');

describe('subdivide', () => {
  it('returns the triangle itself at level 0 (and for a negative level)', () => {
    expect(subdivide(TRI, 0)).toEqual([TRI]);
    expect(subdivide(TRI, -2)).toEqual([TRI]);
  });

  it.each([1, 2, 3, 4])('gives 4^%i triangles', (levels) => {
    expect(subdivide(TRI, levels)).toHaveLength(4 ** levels);
  });

  it('covers exactly the original area, split into equal quarters', () => {
    // Midpoint subdivision is exact up to rounding: 1e-9 is loose for values near 6.
    const parts = subdivide(TRI, 2);
    const total = parts.reduce((s, t) => s + area(t), 0);
    expect(total).toBeCloseTo(area(TRI), 9);
    for (const t of parts) expect(area(t)).toBeCloseTo(area(TRI) / 16, 9);
  });

  it('stays inside the original triangle’s bounding box and keeps its three corners', () => {
    const parts = subdivide(TRI, 3);
    const lo = [0, 1, 2].map((k) => Math.min(...TRI.map((v) => v[k])));
    const hi = [0, 1, 2].map((k) => Math.max(...TRI.map((v) => v[k])));
    for (const v of parts.flat()) {
      for (let k = 0; k < 3; k++) {
        expect(v[k]).toBeGreaterThanOrEqual(lo[k]);
        expect(v[k]).toBeLessThanOrEqual(hi[k]);
      }
    }
    const seen = new Set(parts.flat().map(key));
    for (const corner of TRI) expect(seen.has(key(corner))).toBe(true);
  });
});

describe('roughen', () => {
  const apex = ASSINIBOINE.apex;
  const amount = 0.07;
  // The most a point at height y may move on x and z (y moves at 0.6 of it) — the source's rule.
  const bound = (y: number) => amount * Math.min(1, (apex[1] - y) / 0.8 + 0.2);

  it('is deterministic', () => {
    const p: Vec3 = [-1.9, 1.1, 0.6];
    expect(roughen(p, apex)).toEqual(roughen(p, apex));
  });

  it('leaves the base (y at or below 0) and the apex exactly where they are', () => {
    expect(roughen([-2.7, 0, 0.1], apex)).toEqual([-2.7, 0, 0.1]);
    expect(roughen([0.3, -0.5, 0.2], apex)).toEqual([0.3, -0.5, 0.2]);
    expect(roughen(apex, apex)).toEqual(apex);
  });

  it('leaves everything alone when the amount is 0', () => {
    expect(roughen([-1.9, 1.1, 0.6], apex, 0)).toEqual([-1.9, 1.1, 0.6]);
  });

  it('moves a point by no more than its bound on each axis, and does move it', () => {
    const samples: Vec3[] = [[-2, 0.5, 0.3], [-1.5, 1.2, -0.4], [-0.9, 2, 0.2], [-1.3, 2.8, 0.1], [-1.4, 3.1, 0.1]];
    for (const p of samples) {
      const r = roughen(p, apex, amount);
      const a = bound(p[1]);
      expect(Math.abs(r[0] - p[0])).toBeLessThanOrEqual(a);
      expect(Math.abs(r[1] - p[1])).toBeLessThanOrEqual(a * 0.6);
      expect(Math.abs(r[2] - p[2])).toBeLessThanOrEqual(a);
      expect(r).not.toEqual(p);
    }
  });

  it('allows less movement near the summit than lower down', () => {
    // Fixed heights, same x/z: the bound is what the source guarantees, not the sampled jitter.
    expect(bound(apex[1] - 0.1)).toBeLessThan(bound(apex[1] - 0.5));
    expect(bound(apex[1] - 0.5)).toBeLessThan(bound(apex[1] - 0.8));
    expect(bound(apex[1] - 0.8)).toBe(amount);
    // And the points really are held to it.
    for (const dy of [0.05, 0.1, 0.2]) {
      const p: Vec3 = [apex[0] + 0.1, apex[1] - dy, apex[2] + 0.1];
      const r = roughen(p, apex, amount);
      expect(Math.hypot(r[0] - p[0], r[2] - p[2])).toBeLessThanOrEqual(bound(p[1]) * Math.SQRT2);
    }
  });
});

describe('mountainPositions', () => {
  it.each([[0, 4], [1, 16], [2, 64], [3, 256]])('level %i gives %i triangles (9 numbers each)', (levels, tris) => {
    expect(mountainPositions(ASSINIBOINE, levels)).toHaveLength(tris * 9);
  });

  it('defaults to level 3', () => {
    expect(mountainPositions(RUNDLE)).toHaveLength(mountainPositions(RUNDLE, 3).length);
  });

  for (const [name, m] of [['Assiniboine', ASSINIBOINE], ['Rundle', RUNDLE]] as const) {
    describe(name, () => {
      const p = mountainPositions(m, 3);
      const corners = [m.apex, ...m.base];
      const lo = [0, 1, 2].map((k) => Math.min(...corners.map((v) => v[k])));
      const hi = [0, 1, 2].map((k) => Math.max(...corners.map((v) => v[k])));
      // Roughness moves x/z by at most 0.07 and y by at most 0.042; float32 adds a hair.
      const slack = [0.07, 0.042, 0.07].map((s) => s + 1e-5);

      it('has only finite numbers', () => {
        expect(Array.from(p).every(Number.isFinite)).toBe(true);
      });

      it('keeps every coordinate inside the mountain’s box plus the roughness (p is x,y,z repeating)', () => {
        for (let i = 0; i < p.length; i++) {
          const axis = i % 3;
          expect(p[i]).toBeGreaterThanOrEqual(lo[axis] - slack[axis]);
          expect(p[i]).toBeLessThanOrEqual(hi[axis] + slack[axis]);
        }
      });

      it('keeps the apex and the four base corners exactly', () => {
        const verts = new Set<string>();
        for (let i = 0; i < p.length; i += 3) verts.add(`${p[i]},${p[i + 1]},${p[i + 2]}`);
        for (const c of corners) expect(verts.has(`${Math.fround(c[0])},${Math.fround(c[1])},${Math.fround(c[2])}`)).toBe(true);
      });

      it('never lets a base vertex leave the ground or any vertex rise above the apex', () => {
        for (let i = 1; i < p.length; i += 3) {
          expect(p[i]).toBeGreaterThanOrEqual(0);
          expect(p[i]).toBeLessThanOrEqual(m.apex[1] + 1e-5);
        }
      });
    });
  }
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
