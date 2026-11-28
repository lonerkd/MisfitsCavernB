import { describe, expect, it } from 'vitest';
import { makeCave, MIN_CLEARANCE, type Cave } from './cave';
import { guideInput, hasInput, heightOf, IDLE_TO_AUTO, isAuto, newRunner, NO_INPUT, stepRunner, type Input, type Runner } from './runner';

const cave = makeCave(5);
const run = (r: Runner, seconds: number, input: Input = NO_INPUT, playing = true) => {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) r = stepRunner(r, dt, input, cave, playing);
  return r;
};
const press: Input = { ...NO_INPUT, right: true };

describe('the runner', () => {
  it('runs forward on its own, and while it lives stays between the floor and the ceiling the whole way', () => {
    let r = newRunner(cave);
    const dt = 1 / 60;
    for (let i = 0; i < 60 * 120; i++) {
      r = stepRunner(r, dt, NO_INPUT, cave);
      // A dying figure falls through the world on purpose; a living one never leaves the cave.
      if (!r.death) {
        expect(r.y).toBeLessThanOrEqual(cave.floorAt(r.x) + 1e-9);
        expect(r.y - heightOf(r)).toBeGreaterThanOrEqual(cave.ceilingAt(r.x) - 1e-9);
      }
    }
    expect(r.x).toBeGreaterThan(80);
    expect(isAuto(r)).toBe(true);
  });

  it('is steered: the right arrow runs faster and the left slower, never backwards', () => {
    const cruise = run(newRunner(cave), 3).x;
    expect(run(newRunner(cave), 3, press).x).toBeGreaterThan(cruise + 1);
    const slow = run(newRunner(cave), 3, { ...NO_INPUT, left: true });
    expect(slow.x).toBeLessThan(cruise - 0.5);
    expect(slow.x).toBeGreaterThan(0);
  });

  it('hands over to the autopilot after a few idle seconds, and back the moment there is input, without a jump', () => {
    let r = run(newRunner(cave), 1, press);
    expect(isAuto(r)).toBe(false);
    r = run(r, IDLE_TO_AUTO + 0.1);
    expect(isAuto(r)).toBe(true);
    const before = r;
    const after = stepRunner(before, 1 / 60, press, cave);
    expect(isAuto(after)).toBe(false);
    expect(Math.abs(after.x - before.x)).toBeLessThan(0.05);
    expect(Math.abs(after.speed - before.speed)).toBeLessThan(0.1); // the pace eases, it does not snap
    expect(Math.abs(after.y - before.y)).toBeLessThan(0.05);
  });

  it('leaps when told to, and lands again', () => {
    let r = run(newRunner(cave), 0.5);
    expect(r.grounded).toBe(true);
    r = stepRunner(r, 1 / 60, { ...NO_INPUT, up: true }, cave);
    expect(r.grounded).toBe(false);
    expect(r.vy).toBeLessThan(0);
    r = run(r, 2);
    expect(r.grounded).toBe(true);
  });

  it('crouches under a low ceiling by itself, and stands again after', () => {
    // find a crawl in this cave (a low spot in a crawl zone — a teeth pinch is not one, and the autopilot meets those differently)
    let x = 0; while ((cave.zoneAt(x) !== 'crawl' || cave.floorAt(x) - cave.ceilingAt(x) > 0.24) && x < 2000) x += 0.05;
    expect(x).toBeLessThan(2000);
    let r = { ...newRunner(cave, x - 0.5) };
    let deepest = 0;
    for (let i = 0; i < 60; i++) { r = stepRunner(r, 1 / 60, NO_INPUT, cave); deepest = Math.max(deepest, r.crouch); }
    expect(deepest).toBeGreaterThan(0.6);
    // in the open it stands
    let open = 0; while (cave.floorAt(open) - cave.ceilingAt(open) < 0.6 && open < 4000) open += 0.05;
    r = run({ ...newRunner(cave, open) }, 0.5);
    expect(r.crouch).toBeLessThan(0.2);
  });

  it('strolls when the music is paused', () => {
    const playing = run(newRunner(cave), 4, NO_INPUT, true).x;
    const paused = run(newRunner(cave), 4, NO_INPUT, false).x;
    expect(paused).toBeLessThan(playing * 0.5);
  });

  it('is the same journey for the same cave', () => {
    expect(run(newRunner(cave), 10).x).toBe(run(newRunner(cave), 10).x);
  });

  it('turns a held pointer into the arrows it stands for', () => {
    expect(guideInput(0.5, 0)).toEqual({ right: true, left: false, up: false, down: false });
    expect(guideInput(-0.5, 0.3)).toMatchObject({ left: true, down: true });
    expect(guideInput(0, -0.4).up).toBe(true);
    expect(hasInput(guideInput(0, 0))).toBe(false);
  });

  it('never needs more room than the cave always gives', () => { expect(heightOf(newRunner(cave))).toBeLessThan(MIN_CLEARANCE); });
});

describe('deaths', () => {
  const clearance = (c: Cave, x: number) => c.floorAt(x) - c.ceilingAt(x);
  /** A real floor spike with room above it, in the seed-5 cave. */
  const findSpike = () => {
    for (let x = 2; x < 200; x += 0.02) if (cave.floorToothAt(x) >= 0.08 && clearance(cave, x) >= 0.3) return x;
    return -1;
  };
  /** A figure falling the last little way onto x, mid-run (no respawn grace left). */
  const fallingOnto = (c: Cave, x: number, patch: Partial<Runner> = {}): Runner => {
    const y = c.floorAt(x) - 0.04;
    return { ...newRunner(c, x), grounded: false, vy: 0.4, y, grace: 0, fallFrom: y, ...patch };
  };

  it('dies on the floor tooth it lands on, and is back on safe ground a breath later, running on', () => {
    const spike = findSpike();
    expect(spike).toBeGreaterThan(0);
    let r = fallingOnto(cave, spike, { idleFor: 0 }); // steered
    for (let i = 0; i < 30 && !r.death; i++) r = stepRunner(r, 1 / 60, NO_INPUT, cave);
    expect(r.death?.cause).toBe('teeth');
    expect(r.deaths).toBe(1);
    // the death plays out; then the figure is back, grounded on the floor
    for (let i = 0; i < 70 && r.death; i++) r = stepRunner(r, 1 / 60, NO_INPUT, cave);
    expect(r.death).toBeNull();
    expect(r.grounded).toBe(true);
    expect(r.y).toBeCloseTo(cave.floorAt(r.x), 9);
    // and the run goes on, the one death all it cost
    const x = r.x;
    for (let i = 0; i < 30; i++) r = stepRunner(r, 1 / 60, NO_INPUT, cave);
    expect(r.x).toBeGreaterThan(x);
    expect(r.deaths).toBe(1);
  });

  it('does not exempt the autopilot: the same landing kills it too', () => {
    const spike = findSpike();
    let r = fallingOnto(cave, spike); // newRunner starts on autopilot
    expect(isAuto(r)).toBe(true);
    for (let i = 0; i < 30 && !r.death; i++) r = stepRunner(r, 1 / 60, NO_INPUT, cave);
    expect(r.death?.cause).toBe('teeth');
    expect(r.deaths).toBe(1);
  });

  it('cannot die in the breath after a respawn: the same landing is survived while grace runs', () => {
    const spike = findSpike();
    let r = fallingOnto(cave, spike, { grace: 0.5 });
    for (let i = 0; i < 30; i++) r = stepRunner(r, 1 / 60, NO_INPUT, cave);
    expect(r.deaths).toBe(0);
    expect(r.grounded).toBe(true);
  });

  it('walks over floor teeth unhurt: they are the ground until something lands on them', () => {
    let spike = -1;
    for (let x = 2; x < 200 && spike < 0; x += 0.02) {
      if (cave.floorToothAt(x) < 0.08 || clearance(cave, x) < 0.3) continue;
      let open = true;
      for (let d = -0.6; d <= 0.6; d += 0.05) if (clearance(cave, x + d) < 0.26) open = false;
      if (open) spike = x;
    }
    expect(spike).toBeGreaterThan(0);
    let r = newRunner(cave, spike - 0.6);
    for (let i = 0; i < 90; i++) r = stepRunner(r, 1 / 60, NO_INPUT, cave);
    expect(r.deaths).toBe(0);
    expect(r.x).toBeGreaterThan(spike + 0.3);
  });

  it('kills a steered figure that runs into a crawl standing, and carries the autopilot through the same crawl ducking', () => {
    // a low stretch in a crawl zone whose ceiling is smooth at its mouth (so the death is the head meeting rock)
    let home: Cave | null = null, start = -1;
    for (const seed of [5, 42, 7, 9, 3]) {
      const c = makeCave(seed);
      for (let x = 1; x < 400 && start < 0; x += 0.05) {
        if (c.zoneAt(x) !== 'crawl') continue;
        let ok = true;
        for (let d = 0; d <= 0.9; d += 0.05) if (clearance(c, x + d) > 0.235) ok = false;
        for (let d = 0; d <= 0.3; d += 0.05) if (c.ceilingToothAt(x + d) >= 0.03) ok = false;
        if (ok) { home = c; start = x; }
      }
      if (home) break;
    }
    expect(home).not.toBeNull();
    const c = home!;
    // steered, upright, no ducking
    let r: Runner = { ...newRunner(c, start - 0.25), idleFor: 0, grace: 0 };
    for (let i = 0; i < 90 && !r.death; i++) r = stepRunner(r, 1 / 60, { ...NO_INPUT, right: true }, c);
    expect(r.death?.cause).toBe('head');
    expect(r.crouch).toBeLessThan(0.2);
    // the autopilot, over the same ground, ducks and lives
    let a = newRunner(c, start - 0.25);
    for (let i = 0; i < 240; i++) a = stepRunner(a, 1 / 60, NO_INPUT, c);
    expect(a.deaths).toBe(0);
    expect(a.x).toBeGreaterThan(start + 0.9);
  });

  it('kills a rising figure whose head meets a ceiling tooth', () => {
    let spot = -1;
    for (let x = 2; x < 200 && spot < 0; x += 0.02) {
      let ok = clearance(cave, x) >= 0.35;
      for (let d = 0; d <= 0.06; d += 0.02) if (cave.ceilingToothAt(x + d) < 0.1) ok = false;
      if (ok) spot = x;
    }
    expect(spot).toBeGreaterThan(0);
    const y = cave.ceilingAt(spot) + heightOf(newRunner(cave)) + 0.01; // the head a hair under the ceiling line
    let r: Runner = { ...newRunner(cave, spot), grounded: false, vy: -0.5, y, grace: 0, fallFrom: y };
    for (let i = 0; i < 5 && !r.death; i++) r = stepRunner(r, 1 / 60, NO_INPUT, cave);
    expect(r.death?.cause).toBe('teeth');
  });

  it('kills a steered figure that rises into smooth rock at speed, and stops a gentle rise softly', () => {
    let spot = -1;
    for (let x = 2; x < 200 && spot < 0; x += 0.02) {
      let ok = clearance(cave, x) >= 0.35;
      for (let d = 0; d <= 0.1; d += 0.02) if (cave.ceilingToothAt(x + d) >= 0.03) ok = false;
      for (let d = 0; d <= 0.2; d += 0.02) if (cave.ceilingAt(x + d) < cave.ceilingAt(x) - 0.002) ok = false; // the ceiling must not rise away as the figure drifts forward
      if (ok) spot = x;
    }
    expect(spot).toBeGreaterThan(0);
    const y = cave.ceilingAt(spot) + heightOf(newRunner(cave)) + 0.01;
    const staged = (vy: number): Runner => ({ ...newRunner(cave, spot), grounded: false, vy, y, idleFor: 0, grace: 0, fallFrom: y });
    let fast = staged(-1.2);
    for (let i = 0; i < 5 && !fast.death; i++) fast = stepRunner(fast, 1 / 60, { ...NO_INPUT, up: true }, cave);
    expect(fast.death?.cause).toBe('head');
    let gentle = staged(-0.3);
    for (let i = 0; i < 10 && gentle.vy !== 0; i++) gentle = stepRunner(gentle, 1 / 60, { ...NO_INPUT, up: true }, cave);
    expect(gentle.death).toBeNull();
    expect(gentle.vy).toBe(0);
    expect(gentle.y).toBeCloseTo(cave.ceilingAt(gentle.x) + heightOf(gentle), 6);
  });

  it('kills a fall of more than a screen height, and lands a shorter one', () => {
    // a cliff the real cave never carves (its floor stays within a screen height of itself): the fall rule, staged plainly
    const cliff = (drop: number): Cave => ({
      floorAt: (x) => (x < 2 ? 0.3 : 0.3 + drop),
      ceilingAt: () => -1,
      zoneAt: () => 'tunnel',
      ceilingToothAt: () => 0,
      floorToothAt: () => 0,
    });
    const deep = cliff(1.05);
    let r: Runner = { ...newRunner(deep, 1.9), grace: 0 };
    for (let i = 0; i < 120 && !r.death; i++) r = stepRunner(r, 1 / 60, NO_INPUT, deep);
    expect(r.death?.cause).toBe('fall');
    expect(r.y).toBeLessThan(deep.floorAt(r.x)); // died mid-fall, above the floor it never reached
    const shallow = cliff(0.32);
    let s: Runner = { ...newRunner(shallow, 1.9), grace: 0 };
    for (let i = 0; i < 120; i++) s = stepRunner(s, 1 / 60, NO_INPUT, shallow);
    expect(s.deaths).toBe(0);
    expect(s.grounded).toBe(true);
    expect(s.y).toBeCloseTo(0.62, 9);
  });
});
