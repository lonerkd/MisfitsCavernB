// The cavern's world: an endless side-on cave that is a pure function of x (in screen heights) and a seed, so the same seed is
// always the same cave, nothing is stored, and the runner, the parallax layers and the tests all ask the same questions.
// y runs 0 (top of the screen) to 1 (bottom). Plan: .cavern-intelligence/plans/2026-11-08-the-cavern-experience.md

/** A deterministic hash of an integer and a seed to [0, 1). */
export function hash(n: number, seed: number): number {
  let h = (Math.imul(n | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A string (a track id) to a seed. */
export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h | 0;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth value noise in [-1, 1]. */
export function noise(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = smooth(x - i);
  return mix(hash(i, seed), hash(i + 1, seed), f) * 2 - 1;
}

export type ZoneKind = 'tunnel' | 'chamber' | 'crawl' | 'teeth';
interface Params { clearance: number; roll: number; teeth: number; floorTeeth: number }
const PARAMS: Record<ZoneKind, Params> = {
  tunnel: { clearance: 0.46, roll: 0.05, teeth: 0.05, floorTeeth: 0 },
  chamber: { clearance: 0.7, roll: 0.09, teeth: 0.1, floorTeeth: 0.02 },
  crawl: { clearance: 0.25, roll: 0.03, teeth: 0.03, floorTeeth: 0 },
  teeth: { clearance: 0.5, roll: 0.06, teeth: 0.22, floorTeeth: 0.12 },
};
const KINDS: ZoneKind[] = ['tunnel', 'tunnel', 'chamber', 'teeth', 'crawl', 'chamber', 'tunnel', 'teeth'];
/** How long a zone runs, in screen heights, and how much of its edges blend into the next. */
export const ZONE_LENGTH = 9;
const BLEND = 3;
/** The least gap between floor and ceiling anywhere: enough for the runner to crouch through. */
export const MIN_CLEARANCE = 0.2;
const FLOOR = 0.78;

export interface Cave {
  ceilingAt: (x: number) => number;
  floorAt: (x: number) => number;
  zoneAt: (x: number) => ZoneKind;
}

function zoneIndex(x: number, seed: number) {
  const z = Math.floor(x / ZONE_LENGTH);
  return { z, kind: KINDS[Math.floor(hash(z, seed ^ 0x51ed) * KINDS.length)] };
}

function paramsAt(x: number, seed: number): Params {
  const { z, kind } = zoneIndex(x, seed);
  const here = PARAMS[kind];
  const into = x - z * ZONE_LENGTH;
  // Blend with the zone before near the start and the zone after near the end, so the cave changes shape smoothly.
  if (into < BLEND) {
    const prev = PARAMS[zoneIndex((z - 1) * ZONE_LENGTH, seed).kind];
    const t = smooth(0.5 + into / (2 * BLEND));
    return lerpParams(prev, here, t);
  }
  if (into > ZONE_LENGTH - BLEND) {
    const next = PARAMS[zoneIndex((z + 1) * ZONE_LENGTH, seed).kind];
    const t = smooth((into - (ZONE_LENGTH - BLEND)) / (2 * BLEND));
    return lerpParams(here, next, t);
  }
  return here;
}
const lerpParams = (a: Params, b: Params, t: number): Params => ({ clearance: mix(a.clearance, b.clearance, t), roll: mix(a.roll, b.roll, t), teeth: mix(a.teeth, b.teeth, t), floorTeeth: mix(a.floorTeeth, b.floorTeeth, t) });

/** A row of pointed teeth: each cell has a tooth of its own height, off-centre, that may be absent. 0 where there is none. */
function teeth(x: number, seed: number, period: number, tall: number): number {
  const cell = Math.floor(x / period);
  let best = 0;
  for (let c = cell - 1; c <= cell + 1; c++) {
    if (hash(c, seed) < 0.35) continue;
    const centre = (c + 0.15 + hash(c, seed + 1) * 0.7) * period;
    const half = period * (0.18 + hash(c, seed + 2) * 0.22);
    const height = tall * (0.35 + hash(c, seed + 3) * 0.65);
    best = Math.max(best, Math.max(0, 1 - Math.abs(x - centre) / half) * height);
  }
  return best;
}

export function makeCave(seed: number): Cave {
  const floorAt = (x: number) => {
    const p = paramsAt(x, seed);
    const roll = (noise(x * 0.35, seed + 11) * 0.7 + noise(x * 0.9, seed + 12) * 0.3) * p.roll;
    const grain = noise(x * 3.1, seed + 13) * 0.012 + noise(x * 7.3, seed + 14) * 0.006; // the rock is never smooth
    return clamp(FLOOR + roll + grain - teeth(x, seed + 21, 0.9, p.floorTeeth), 0.5, 0.92);
  };
  const ceilingAt = (x: number) => {
    const p = paramsAt(x, seed);
    const wander = (noise(x * 0.3, seed + 31) * 0.6 + noise(x * 0.8, seed + 32) * 0.4) * 0.07 + noise(x * 2.7, seed + 33) * 0.014 + noise(x * 6.9, seed + 34) * 0.007;
    const base = FLOOR - p.clearance + wander + teeth(x, seed + 41, 0.7, p.teeth * 2.4);
    // Never close the passage: whatever the teeth do, there is always room to crouch through.
    return clamp(Math.min(base, floorAt(x) - MIN_CLEARANCE), 0.02, 0.9);
  };
  return { floorAt, ceilingAt, zoneAt: (x) => zoneIndex(x, seed).kind };
}

/** Old cave until `from`, the new one after `from + length`, blended between: so a new song changes the cave out of sight, not with a pop. */
export function blendCaves(a: Cave, b: Cave, from: number, length: number): Cave {
  const t = (x: number) => smooth(clamp((x - from) / length, 0, 1));
  // Outside the blend only one cave is asked, so a long session of song changes does not make every question slower.
  return {
    floorAt: (x) => (x <= from ? a.floorAt(x) : x >= from + length ? b.floorAt(x) : mix(a.floorAt(x), b.floorAt(x), t(x))),
    // Both ceilings respect the minimum clearance against their own floors; the blend of two valid pairs is valid.
    ceilingAt: (x) => (x <= from ? a.ceilingAt(x) : x >= from + length ? b.ceilingAt(x) : mix(a.ceilingAt(x), b.ceilingAt(x), t(x))),
    zoneAt: (x) => (t(x) < 0.5 ? a.zoneAt(x) : b.zoneAt(x)),
  };
}
