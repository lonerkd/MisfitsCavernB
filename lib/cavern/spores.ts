// Drifting specks of light in the cave, in cave coordinates, recycled as the runner leaves them behind. Pure and seeded.
import { hash, type Cave } from './cave';

export interface Spore { x: number; y: number; size: number; rise: number; phase: number; n: number }

/** How far behind the camera a speck lives before it is moved ahead, and how far ahead it appears (screen heights). */
export const BEHIND = 0.7;

function place(n: number, cave: Cave, camX: number, ahead: number, seed: number): Spore {
  const x = camX - BEHIND + hash(n, seed) * (BEHIND + ahead);
  const lo = cave.ceilingAt(x), hi = cave.floorAt(x);
  return { x, y: lo + (hi - lo) * (0.1 + hash(n, seed + 1) * 0.8), size: 0.4 + hash(n, seed + 2) * 1.6, rise: 0.004 + hash(n, seed + 3) * 0.02, phase: hash(n, seed + 4) * 6.283, n };
}

export function makeSpores(count: number, cave: Cave, camX: number, ahead: number, seed: number): Spore[] {
  return Array.from({ length: count }, (_, i) => place(i, cave, camX, ahead, seed));
}

/** Drifts each speck up a little; one the runner has left behind (or that rose out of the cave) reappears ahead. */
export function stepSpores(spores: Spore[], cave: Cave, camX: number, ahead: number, dt: number, seed: number): Spore[] {
  return spores.map((s) => {
    const y = s.y - s.rise * dt;
    const out = s.x < camX - BEHIND || y < cave.ceilingAt(s.x) || y > cave.floorAt(s.x);
    if (!out) return { ...s, y };
    const n = s.n + spores.length * 7919; // a fresh spot each time, so the same ones do not return
    return { ...place(n, cave, camX + BEHIND + 0.2, ahead, seed), n };
  });
}
