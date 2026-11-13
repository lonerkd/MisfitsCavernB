import { describe, expect, it } from 'vitest';
import { autoSteer, BOUNCE, FALL_LIMIT, metres, newDive, nextTile, project, reseed, stepDive, type Dive } from './dive';
import { DEADZONE, keySteer, pointerSteer } from './diveSteer';

const run = (g: Dive, seconds: number, steer = { x: 0, z: 0 }) => {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) events.push(...stepDive(g, 1 / 60, steer));
  return events;
};

describe('the shaft', () => {
  it('is the same shaft for the same seed, and a different one for another', () => {
    const a = newDive(7), b = newDive(7), c = newDive(8);
    expect(a.tiles.map((t) => [t.x, t.y, t.z, t.kind])).toEqual(b.tiles.map((t) => [t.x, t.y, t.z, t.kind]));
    expect(a.tiles.map((t) => t.x)).not.toEqual(c.tiles.map((t) => t.x));
  });

  it('bounces off the tile under you and does not fall through it', () => {
    const g = newDive(1);
    const events = run(g, 2);
    expect(events).toContain('land');
    expect(g.y).toBeGreaterThan(-2.2);
  });

  it('is thrown back up with the bounce speed', () => {
    const g = newDive(1);
    let landed = false;
    for (let i = 0; i < 300 && !landed; i++) landed = stepDive(g, 1 / 60, { x: 0, z: 0 }).includes('land');
    expect(landed).toBe(true);
    expect(g.vy).toBeCloseTo(BOUNCE, 5);
  });

  it('cannot be lost: after a long fall the cave sets you back on a tile that holds, and the depth is kept', () => {
    const g = newDive(1);
    run(g, 0.5);
    g.tiles.length = 0;       // nothing to catch you
    g.lastY = g.y - 60;
    const events = run(g, 3);
    expect(events).toContain('rescue');
    expect(g.rescues).toBeGreaterThan(0);
    expect(metres(g)).toBeGreaterThan(0);
    expect(g.y).toBeGreaterThan(g.restY - FALL_LIMIT);
    // and it lands again on the tile put under it
    expect(run(g, 2)).toContain('land');
  });

  it('a fragile tile gives once, then lets go', () => {
    const g = newDive(3);
    g.tiles[0].kind = 'fragile';
    expect(run(g, 1.5)).toContain('break');
  });

  it('keeps tiles coming below you and drops the ones above', () => {
    const g = newDive(5);
    g.y = -80; g.restY = -80;
    stepDive(g, 1 / 60, { x: 0, z: 0 });
    expect(g.tiles.some((t) => t.y < g.y - 30)).toBe(true);
    expect(g.tiles.every((t) => t.y < g.y + 6)).toBe(true);
  });

  it('every tile can be reached from the one before it', () => {
    const g = newDive(11);
    g.y = -300; g.restY = -300;
    stepDive(g, 1 / 60, { x: 0, z: 0 });
    const down = [...g.tiles].sort((p, q) => q.y - p.y);
    for (let i = 1; i < down.length; i++) {
      const gap = Math.hypot(down[i].baseX - down[i - 1].baseX, down[i].z - down[i - 1].z);
      expect(gap).toBeLessThanOrEqual(5.01); // 2.8 + up to 1.4 + 0.8 at full depth
    }
  });

  it('a long frame (a sleeping tab) cannot tunnel through every tile', () => {
    const g = newDive(1);
    stepDive(g, 30, { x: 0, z: 0 });
    expect(g.y).toBeGreaterThan(-3);
  });

  it('a new song changes the shaft below without moving the tiles already made', () => {
    const a = newDive(1), b = newDive(1);
    reseed(b, 99);
    expect(b.tiles.map((t) => t.x)).toEqual(a.tiles.map((t) => t.x)); // nothing already made moves
    for (const g of [a, b]) { g.y = -100; g.restY = -100; stepDive(g, 1 / 60, { x: 0, z: 0 }); }
    expect(b.tiles.map((t) => t.x)).not.toEqual(a.tiles.map((t) => t.x)); // the new ones are the new song's
  });

  it('projects a tile at the centre when it is under you, and not at all when above', () => {
    const g = newDive(1);
    const t = g.tiles[0];
    const p = project(g, t, 800, 600)!;
    expect(p.cx).toBeCloseTo(400, 5);
    expect(p.cy).toBeCloseTo(300, 5);
    g.y = t.y - 1;
    expect(project(g, t, 800, 600)).toBeNull();
  });
});

describe('the autopilot', () => {
  it('heads for the next tile below the one last touched, and nudges on past it when it is there', () => {
    const g = newDive(4);
    run(g, 0.4); // touch the first tile
    const next = nextTile(g)!;
    expect(next.y).toBeLessThan(g.restY);
    const s = autoSteer(g);
    expect(Math.sign(s.x) === Math.sign(next.x - g.x) || s.x === 0).toBe(true);
    // Standing on the tile it only nudges on, away from the one it left (so it does not fall back onto that one).
    g.x = next.x; g.z = next.z;
    const nudge = autoSteer(g);
    expect(Math.hypot(nudge.x, nudge.z)).toBeLessThan(0.4);
    expect(nudge.x * (next.x - g.restX) + nudge.z * (next.z - g.restZ)).toBeGreaterThanOrEqual(0);
  });

  it('keeps itself going for a minute with nobody steering: many bounces, never stuck', () => {
    const g = newDive(21);
    for (let t = 0; t < 60; t += 1 / 60) stepDive(g, 1 / 60, autoSteer(g));
    expect(g.bounces).toBeGreaterThan(20);
    expect(metres(g)).toBeGreaterThan(20);
  });
});

describe('steering', () => {
  it('ignores a pointer resting near the middle', () => {
    expect(pointerSteer(0.5, 0.5)).toEqual({ x: 0, z: 0 });
    expect(pointerSteer(0.5 + DEADZONE / 4, 0.5)).toEqual({ x: 0, z: 0 });
  });

  it('goes right for a pointer on the right and up the screen for one near the top', () => {
    expect(pointerSteer(0.95, 0.5).x).toBeGreaterThan(0.9);
    expect(pointerSteer(0.5, 0.02).z).toBeGreaterThan(0.9);
    expect(pointerSteer(0.5, 0.98).z).toBeLessThan(-0.9);
  });

  it('eases in: halfway to the edge is under half speed', () => {
    const half = pointerSteer(0.75, 0.5).x;
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(0.5);
  });

  it('reads held arrows, with diagonals no faster than straight', () => {
    expect(keySteer(true, false, false, false)).toEqual({ x: -1, z: 0 });
    expect(keySteer(false, false, true, false)).toEqual({ x: 0, z: 1 });
    const d = keySteer(false, true, true, false);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1, 5);
  });
});
