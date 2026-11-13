import { describe, expect, it } from 'vitest';
import { makeCave, MIN_CLEARANCE } from './cave';
import { guideInput, hasInput, heightOf, IDLE_TO_AUTO, isAuto, newRunner, NO_INPUT, stepRunner, type Input, type Runner } from './runner';

const cave = makeCave(5);
const run = (r: Runner, seconds: number, input: Input = NO_INPUT, playing = true) => {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) r = stepRunner(r, dt, input, cave, playing);
  return r;
};
const press: Input = { ...NO_INPUT, right: true };

describe('the runner', () => {
  it('runs forward on its own, and stays between the floor and the ceiling the whole way', () => {
    let r = newRunner(cave);
    const dt = 1 / 60;
    for (let i = 0; i < 60 * 120; i++) {
      r = stepRunner(r, dt, NO_INPUT, cave);
      expect(r.y).toBeLessThanOrEqual(cave.floorAt(r.x) + 1e-9);
      expect(r.y - heightOf(r)).toBeGreaterThanOrEqual(cave.ceilingAt(r.x) - 1e-9);
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
    // find a crawl in this cave
    let x = 0; while (cave.floorAt(x) - cave.ceilingAt(x) > 0.24 && x < 2000) x += 0.05;
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
