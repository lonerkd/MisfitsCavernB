// The Cavern's mark in three dimensions (the landing hero): the R13 pyramid
// (Assiniboine) and tilted slab (Rundle) as low-poly rock, and the crescent.
// Pure geometry — plain numbers, no three.js — so it's deterministic and
// unit-tested; components/brand/Mark3D.tsx turns it into meshes.
//
// Units: the flat mark's 120-unit viewBox / 20, y up, the base at y = 0,
// the mountains' pivot at x = 0. The faces toward the moon (upper right)
// catch its light; the shader colours them vanilla, the rest sinopia.

export type Vec3 = [number, number, number];

export interface Mountain {
  apex: Vec3;
  /** Base corners, in order round the base (front, right, back, left). */
  base: [Vec3, Vec3, Vec3, Vec3];
  /** Height above which the faces carry snow. */
  snowline: number;
}

export const ASSINIBOINE: Mountain = {
  apex: [-1.35, 3.2, 0.1],
  base: [[-1.35, 0, 1.35], [0, 0, 0.1], [-1.35, 0, -1.15], [-2.7, 0, 0.1]],
  snowline: 2.45,
};

export const RUNDLE: Mountain = {
  apex: [1.35, 3.7, -0.25],
  base: [[1.45, 0, 1.25], [2.75, 0, 0.05], [1.15, 0, -1.75], [-0.25, 0, 0.15]],
  snowline: 2.95,
};

/** The crescent: where it hangs, its radius, and the bite out of it (as in the flat mark). */
export const MOON = { centre: [2.25, 3.85, -0.9] as Vec3, radius: 0.36, bite: { dx: 0.45, dy: 0.32, r: 0.84 } };

/** Where the light comes from: the moon, low and to the right, so the front faces split — right lit, left in shadow. */
export const LIGHT_DIR: Vec3 = normalise([1, 0.55, 0.05]);

export function normalise(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

const mid = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

/** Splits a triangle into 4^levels smaller ones (midpoint subdivision). */
export function subdivide(tri: [Vec3, Vec3, Vec3], levels: number): [Vec3, Vec3, Vec3][] {
  if (levels <= 0) return [tri];
  const [a, b, c] = tri;
  const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
  return ([[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]] as [Vec3, Vec3, Vec3][])
    .flatMap((t) => subdivide(t, levels - 1));
}

// A repeatable pseudo-random number in [-1, 1] for a point: the same corner
// shared by neighbouring triangles moves the same way, so the rock has no cracks.
function hash(v: Vec3, salt: number): number {
  const k = (n: number) => Math.round(n * 1e4) / 1e4;
  const s = Math.sin(k(v[0]) * 127.1 + k(v[1]) * 311.7 + k(v[2]) * 74.7 + salt * 17.3) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/** Roughens a point into rock; the base and the summit stay where they are. */
export function roughen(v: Vec3, apex: Vec3, amount = 0.07): Vec3 {
  if (v[1] <= 1e-6) return v;
  if (Math.hypot(v[0] - apex[0], v[1] - apex[1], v[2] - apex[2]) < 1e-6) return v;
  // Less near the summit, so the peak stays sharp.
  const a = amount * Math.min(1, (apex[1] - v[1]) / 0.8 + 0.2);
  return [v[0] + hash(v, 1) * a, v[1] + hash(v, 2) * a * 0.6, v[2] + hash(v, 3) * a];
}

/** A mountain's faces as a flat list of triangle corners (x, y, z, …) for a BufferGeometry. */
export function mountainPositions(m: Mountain, levels = 3): Float32Array {
  const tris: [Vec3, Vec3, Vec3][] = [];
  for (let i = 0; i < 4; i++) {
    const face: [Vec3, Vec3, Vec3] = [m.apex, m.base[i], m.base[(i + 1) % 4]];
    tris.push(...subdivide(face, levels));
  }
  const out = new Float32Array(tris.length * 9);
  tris.forEach((t, i) => t.forEach((v, j) => out.set(roughen(v, m.apex), i * 9 + j * 3)));
  return out;
}

// Points along a circle from one angle to another, going the way round that
// passes through `via`.
function arc(cx: number, cy: number, r: number, from: number, to: number, via: number, steps: number): [number, number][] {
  const TAU = Math.PI * 2;
  const ccw = (a: number, b: number) => ((b - a) % TAU + TAU) % TAU; // sweep a → b anticlockwise
  const sweep = ccw(from, via) <= ccw(from, to) ? ccw(from, to) : -(TAU - ccw(from, to));
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = from + (sweep * i) / steps;
    pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
  }
  return pts;
}

/**
 * The crescent's outline (x, y around the moon's centre), anticlockwise or
 * clockwise but never crossing itself: the moon's rim the long way round,
 * away from the bite, then the bite's rim back through the moon.
 */
export function crescentOutline(steps = 32): [number, number][] {
  const { radius: r, bite } = MOON;
  const bx = bite.dx * r, by = bite.dy * r, br = bite.r * r;
  const d = Math.hypot(bx, by);
  // Where the two circles cross.
  const a = (r * r - br * br + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r * r - a * a));
  const px = (a * bx) / d, py = (a * by) / d;
  const ux = -by / d, uy = bx / d;
  const i1: [number, number] = [px + h * ux, py + h * uy];
  const i2: [number, number] = [px - h * ux, py - h * uy];
  const away = Math.atan2(by, bx) + Math.PI; // the lit side, opposite the bite
  const outer = arc(0, 0, r, Math.atan2(i1[1], i1[0]), Math.atan2(i2[1], i2[0]), away, steps);
  const inner = arc(bx, by, br, Math.atan2(i2[1] - by, i2[0] - bx), Math.atan2(i1[1] - by, i1[0] - bx), away, steps);
  // Both arcs share their end points; drop the duplicates.
  return [...outer, ...inner.slice(1, -1)];
}
