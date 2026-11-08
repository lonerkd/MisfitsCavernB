// The runner: a small figure that runs through the cave on its own, and that the person can steer. Pure and React-free, so the
// canvas, the tests and (later) anything else read the same rules. There is no fail state: the cave never hurts the runner.
import type { Cave } from './cave';

export interface Runner {
  /** Where it is in the cave, in screen heights; y is its feet. */
  x: number;
  y: number;
  vy: number;
  /** Screen heights a second. */
  speed: number;
  grounded: boolean;
  /** 0 standing, 1 fully crouched. */
  crouch: number;
  /** The run cycle, in radians. */
  phase: number;
  /** Seconds since the person last gave an input. */
  idleFor: number;
  /** When the autopilot last decided to leap, so it does not stutter. */
  leapCooldown: number;
}

export interface Input { left: boolean; right: boolean; up: boolean; down: boolean }
export const NO_INPUT: Input = { left: false, right: false, up: false, down: false };

/** After this long with no input, the autopilot takes over. */
export const IDLE_TO_AUTO = 6;
export const STAND_HEIGHT = 0.15;
export const CROUCH_HEIGHT = 0.1;
export const CRUISE = 0.95;
const FAST = 1.9;
const SLOW = 0.3;
const GRAVITY = 3.4;
const LEAP = 1.35;

const approach = (v: number, target: number, rate: number, dt: number) => v + (target - v) * Math.min(1, rate * dt);

export function newRunner(cave: Cave, x = 0): Runner {
  return { x, y: cave.floorAt(x), vy: 0, speed: CRUISE, grounded: true, crouch: 0, phase: 0, idleFor: IDLE_TO_AUTO, leapCooldown: 0 };
}

export const isAuto = (r: Runner) => r.idleFor >= IDLE_TO_AUTO;
export const hasInput = (i: Input) => i.left || i.right || i.up || i.down;

/** A held pointer or finger, relative to the runner (in screen heights, y down), as the arrows it stands for. */
export function guideInput(dx: number, dy: number): Input {
  const dead = 0.08;
  return { right: dx > dead, left: dx < -dead * 2, up: dy < -0.16, down: dy > 0.16 };
}

/** Height of the figure now, for the cave to be checked against. */
export const heightOf = (r: Runner) => STAND_HEIGHT + (CROUCH_HEIGHT - STAND_HEIGHT) * r.crouch;

export function stepRunner(prev: Runner, dt: number, input: Input, cave: Cave, playing = true): Runner {
  const r = { ...prev };
  const given = hasInput(input);
  r.idleFor = given ? 0 : Math.min(r.idleFor + dt, IDLE_TO_AUTO + 1);
  const auto = isAuto(r);
  r.leapCooldown = Math.max(0, r.leapCooldown - dt);

  // The pace. Steered: right is faster, left slower (it never runs backwards). On its own it cruises, a little faster across open
  // ground. Paused music slows it to a stroll. Speed always eases, so taking the controls never jerks it.
  let target = CRUISE;
  if (!auto) target = input.right ? FAST : input.left ? SLOW : CRUISE;
  else target = CRUISE * (0.92 + 0.16 * Math.sin(r.x * 0.21));
  if (!playing) target *= 0.25;
  r.speed = approach(r.speed, target, auto ? 0.8 : 2.4, dt);
  r.x += r.speed * dt;

  const floor = cave.floorAt(r.x);
  const ceiling = cave.ceilingAt(r.x);
  const ahead = (d: number) => ({ floor: cave.floorAt(r.x + d), ceiling: cave.ceilingAt(r.x + d) });

  // Crouch under low ceilings by itself (steered or not), and when told to.
  const near = ahead(0.22);
  const room = Math.max(ceiling, near.ceiling); // the lower of the two: the one it would hit
  const tight = floor - room < STAND_HEIGHT + 0.12;
  r.crouch = approach(r.crouch, tight || (!auto && input.down && r.grounded) ? 1 : 0, 9, dt);

  // Leaping: when told to, or (on its own) when the ground ahead rises steeply or turns to teeth.
  const rise = floor - Math.min(ahead(0.18).floor, ahead(0.34).floor);
  const wantsLeap = auto ? rise > 0.07 && !tight : input.up;
  if (r.grounded && wantsLeap && r.leapCooldown === 0 && !tight) { r.vy = -LEAP; r.grounded = false; r.leapCooldown = 0.45; }

  if (r.grounded) {
    // Stick to the ground; if it falls away faster than the runner can follow, it leaves the ground and falls.
    if (floor - r.y > 0.05) { r.grounded = false; r.vy = 0; } else { r.y = floor; r.vy = 0; }
  }
  if (!r.grounded) {
    r.vy += GRAVITY * dt;
    r.y += r.vy * dt;
    if (r.y >= floor) { r.y = floor; r.vy = 0; r.grounded = true; }
  }
  // The head meets the ceiling softly: it stops rising, never damage.
  const head = r.y - heightOf(r);
  if (head < ceiling) { r.y = ceiling + heightOf(r); if (r.vy < 0) r.vy = 0; }
  if (r.y > floor) r.y = floor;

  r.phase += r.speed * dt * (r.grounded ? 9.5 : 3);
  return r;
}
