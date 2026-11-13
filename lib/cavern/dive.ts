// The dive: the cavern seen from the first person. You are a grey blob falling down a shaft and you look straight down, so tiles
// come up at you, small and dim far off, big and sharp as you reach them. Land on one and it throws you back up; steer in the air to
// catch the next. Like the runner there is no way to lose: miss every tile and the cave sets you back on the last one you touched.
// Depth is the tally. Pure and React-free, so the drawing, the tests and the autopilot read the same rules.
//
// Axes: x is right, z is "up the screen", y is height (you only go down, bouncing). The state is mutated in place every frame (a
// game loop allocates nothing); a reader that needs to know it changed watches `frame`.

export type TileKind = 'solid' | 'moving' | 'fragile' | 'spring';

export interface Tile {
  id: number;
  x: number; y: number; z: number;
  /** Half the side of the square, in metres. */
  half: number;
  kind: TileKind;
  /** Moving tiles slide along x around `baseX`. */
  baseX: number; amp: number; speed: number; phase: number;
  /** A fragile tile that has been landed on: 0 whole, then fading towards 1 (gone). */
  broken: number;
}

export interface Dive {
  seed: number;
  frame: number;
  time: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  /** Nearest first (highest y first). */
  tiles: Tile[];
  nextId: number;
  /** Where the last tile was put: the next one is placed within reach of it. */
  lastX: number; lastY: number; lastZ: number;
  /** The last tile landed on: where the cave sets you back after a long fall. */
  restX: number; restY: number; restZ: number;
  /** Deepest point reached, in metres below the start. */
  depth: number;
  bounces: number;
  rescues: number;
  /** 1 at a landing, falling away: the picture squashes and flashes with it. */
  pulse: number;
}

/** What the player asks for: both in -1..1, x right, z up the screen. */
export interface Steer { x: number; z: number }
export type DiveEvent = 'land' | 'spring' | 'break' | 'rescue';

export const GRAVITY = 24;
export const BOUNCE = 10.5;
export const SPRING_BOUNCE = 16;
export const MAX_SPEED = 6.5;
export const ACCEL = 28;
/** The blob's radius: a tile holds you if your centre is within its edge plus this much. */
export const BLOB = 0.28;
/** How far below the last landing you may fall before the cave sets you back. */
export const FALL_LIMIT = 9;
const SPAWN_AHEAD = 46;
const KEEP_BEHIND = 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A small seeded generator: the same song gives the same shaft. */
export function rand(g: Dive): number {
  let t = (g.seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** How hard the shaft is `depth` metres down: 0 at the top, 1 from about 120 m. Gentle on purpose: this is for zoning out. */
export const difficulty = (depth: number): number => clamp(depth / 120, 0, 1);

export function newDive(seed: number): Dive {
  const g: Dive = {
    seed, frame: 0, time: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    tiles: [], nextId: 1, lastX: 0, lastY: -2, lastZ: 0, restX: 0, restY: -2, restZ: 0, depth: 0, bounces: 0, rescues: 0, pulse: 0,
  };
  // A wide, kind tile to begin on, then the shaft.
  g.tiles.push({ id: g.nextId++, x: 0, y: -2, z: 0, half: 1.6, kind: 'solid', baseX: 0, amp: 0, speed: 0, phase: 0, broken: 0 });
  fill(g);
  return g;
}

/** Put tiles in until there are enough below the player. Each is within what a bounce and steering can reach. */
function fill(g: Dive): void {
  while (g.lastY > g.y - SPAWN_AHEAD) {
    const d = difficulty(-g.lastY);
    const gap = 1.6 + rand(g) * (1.0 + d);
    const roll = rand(g);
    const kind: TileKind = roll < 0.08 + d * 0.06 ? 'spring' : roll < 0.28 + d * 0.12 ? 'moving' : roll < 0.4 + d * 0.22 ? 'fragile' : 'solid';
    const half = 1.0 - d * 0.35 + (rand(g) - 0.5) * 0.2;
    // A bounce takes you higher than the gap to the next tile, so on the way down you pass the heights of the tiles just left. The
    // new one must stand clear of the last three (their squares plus a blob's width and a margin), or you would fall back onto
    // one of them; of several tries the first that does is used, else the one furthest from them.
    const recent = g.tiles.slice(-3);
    const clearOf = (x: number, z: number) => Math.min(...recent.map((t) => Math.hypot(x - t.x, z - t.z) - (t.half + half + 2 * BLOB + 0.25)));
    let x = g.lastX, z = g.lastZ, best = -Infinity;
    for (let tries = 0; tries < 8; tries++) {
      const reach = 2.8 + rand(g) * (1.4 + d * 0.8);
      const angle = rand(g) * Math.PI * 2;
      const cx = clamp(g.lastX + Math.cos(angle) * reach, -7, 7), cz = clamp(g.lastZ + Math.sin(angle) * reach, -7, 7);
      const room = clearOf(cx, cz);
      if (room > best) { best = room; x = cx; z = cz; }
      if (room >= 0) break;
    }
    g.lastY -= gap;
    const moving = kind === 'moving';
    g.tiles.push({
      id: g.nextId++, x, y: g.lastY, z, half: kind === 'spring' ? half * 0.8 : half, kind,
      baseX: x, amp: moving ? 1.2 + rand(g) * 1.6 : 0, speed: moving ? 0.8 + rand(g) * 1.0 : 0, phase: rand(g) * 6.28, broken: 0,
    });
    g.lastX = x; g.lastZ = z;
  }
}

/** From now on the shaft below is the new song's: the tiles already made stay, so nothing pops. */
export function reseed(g: Dive, seed: number): void { g.seed = seed; }

/**
 * Advance by `dtRaw` seconds (clamped: a tab that slept must not tunnel through every tile at once). Returns what happened.
 */
export function stepDive(g: Dive, dtRaw: number, steer: Steer): DiveEvent[] {
  const events: DiveEvent[] = [];
  const dt = clamp(dtRaw, 0, 1 / 20);
  g.frame++;
  g.time += dt;
  g.pulse = Math.max(0, g.pulse - dt * 2.4);
  for (const t of g.tiles) {
    if (t.kind === 'moving') t.x = t.baseX + Math.sin(g.time * t.speed + t.phase) * t.amp;
    if (t.broken > 0 && t.broken < 1) t.broken = Math.min(1, t.broken + dt * 2.5);
  }

  // Steer: ease towards the asked speed, so the blob has weight but never feels stuck.
  g.vx += clamp(clamp(steer.x, -1, 1) * MAX_SPEED - g.vx, -ACCEL * dt, ACCEL * dt);
  g.vz += clamp(clamp(steer.z, -1, 1) * MAX_SPEED - g.vz, -ACCEL * dt, ACCEL * dt);
  g.x = clamp(g.x + g.vx * dt, -8, 8);
  g.z = clamp(g.z + g.vz * dt, -8, 8);

  const before = g.y;
  g.vy -= GRAVITY * dt;
  g.y += g.vy * dt;

  if (g.vy < 0) {
    for (const t of g.tiles) {
      if (t.broken > 0 || t.y > before + 1e-6 || t.y < g.y - 1e-6) continue; // crossed this tile's height this frame
      if (Math.abs(g.x - t.x) > t.half + BLOB || Math.abs(g.z - t.z) > t.half + BLOB) continue;
      g.y = t.y;
      g.vy = t.kind === 'spring' ? SPRING_BOUNCE : BOUNCE;
      g.restX = t.x; g.restY = t.y; g.restZ = t.z;
      g.bounces++;
      g.pulse = 1;
      events.push(t.kind === 'spring' ? 'spring' : 'land');
      if (t.kind === 'fragile') { t.broken = 0.001; events.push('break'); }
      break;
    }
  }

  g.depth = Math.max(g.depth, -g.y);

  // No way to lose: after a long fall the cave sets you back above the last tile you touched, on a tile that holds.
  if (g.y < g.restY - FALL_LIMIT) {
    g.tiles = g.tiles.filter((t) => t.y < g.restY - 0.05);
    g.tiles.unshift({ id: g.nextId++, x: g.restX, y: g.restY, z: g.restZ, half: 1.3, kind: 'solid', baseX: g.restX, amp: 0, speed: 0, phase: 0, broken: 0 });
    g.x = g.restX; g.z = g.restZ; g.y = g.restY + 3; g.vx = g.vz = g.vy = 0;
    g.rescues++;
    events.push('rescue');
  }

  fill(g);
  g.tiles = g.tiles.filter((t) => t.y < g.y + KEEP_BEHIND);
  return events;
}

/** The next tile below the one you last touched: where the autopilot is heading. */
export function nextTile(g: Dive): Tile | null {
  let best: Tile | null = null;
  for (const t of g.tiles) {
    if (t.y >= g.restY - 0.05 || t.broken > 0) continue;
    if (!best || t.y > best.y) best = t;
  }
  return best;
}

/** The autopilot: steer towards the next solid-enough tile, easing off as it closes in so it settles rather than overshoots. */
export function autoSteer(g: Dive): Steer {
  const t = nextTile(g);
  if (!t) return { x: 0, z: 0 };
  // Aim for the far side of the next tile, away from the one just left: the two squares overlap when they are close, and a blob
  // still over the old one falls straight back onto it. A moving tile is chased where it is now.
  const ax = t.x - g.restX, az = t.z - g.restZ, len = Math.hypot(ax, az) || 1;
  const dx = t.x + (ax / len) * t.half * 0.6 - g.x, dz = t.z + (az / len) * t.half * 0.6 - g.z;
  const k = 1 / 2.2; // full speed from about two metres off
  return { x: clamp(dx * k, -1, 1), z: clamp(dz * k, -1, 1) };
}

/** Where a tile is on a canvas `w` by `h` px, seen from the blob's eyes, or null if it is behind or too close to draw. */
export interface Projected { cx: number; cy: number; size: number; depth: number; fog: number; k: number }

export function project(g: Dive, t: Tile, w: number, h: number): Projected | null {
  const d = g.y - t.y; // metres below your eyes
  if (d < 0.05) return null;
  const f = Math.min(w, h) * 0.62;
  const k = f / (d + 0.7);
  return { cx: w / 2 + (t.x - g.x) * k, cy: h / 2 - (t.z - g.z) * k, size: t.half * 2 * k, depth: d, fog: clamp(d / 34, 0, 1), k };
}

/** The tally a person sees: whole metres down. */
export const metres = (g: Pick<Dive, 'depth'>): number => Math.floor(g.depth);
