// The runner: a small figure that runs through the cave on its own, and that the person can steer. Pure and React-free, so the
// canvas, the tests and (later) anything else read the same rules. The cave can hurt it: teeth (the floor's and the ceiling's),
// a ceiling met at rise speed, a low passage it did not duck for, a fall too far. A death costs nothing but the moment — the
// figure falls where it died, and after a breath it is back on the last safe ground while the song and the journey carry on.
// The autopilot plays by the same rules as a steering person; its assists usually save it, and when they do not, it dies too.
import type { Cave } from './cave';

/** What can kill the figure: a tooth (floor or ceiling), its head meeting the ceiling, or a fall. */
export type DeathCause = 'teeth' | 'head' | 'fall';

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
  /** Deaths so far. Quiet bookkeeping in the run state; nothing draws it. */
  deaths: number;
  /** The death being played out, if any: what killed it and how long ago, in seconds. While set, the figure falls instead of running. */
  death: { cause: DeathCause; t: number } | null;
  /** The last x where the figure stood on ground that could not hurt it: where a death returns it. */
  safeX: number;
  /** The feet's y when the figure last left the ground, or null while it is on it: the fall rule measures the drop from here. */
  fallFrom: number | null;
  /** Seconds of protection left after a respawn: the cave cannot kill it while this runs, so coming back never drops it straight into a second death at the same spot — it gets a breath to clear the hazard that killed it. */
  grace: number;
}

export interface Input { left: boolean; right: boolean; up: boolean; down: boolean }
export const NO_INPUT: Input = { left: false, right: false, up: false, down: false };

/** After this long with no input, the autopilot takes over. */
export const IDLE_TO_AUTO = 6;
export const STAND_HEIGHT = 0.15;
export const CROUCH_HEIGHT = 0.1;
export const CRUISE = 0.95;
/** How long a death plays out (the fall, the breath of spores) before the figure is back on safe ground. */
export const DEATH_TIME = 0.9;
/** A tooth shorter than this, in screen heights, is a pebble, not a hazard. */
const TOOTH_MIN = 0.03;
/** Meeting a ceiling faster than this (screen heights a second, upward) kills a steered figure; slower is the old soft stop. */
const HEAD_KILL_SPEED = 0.55;
/**
 * The headroom the figure needs beyond its own height: where the passage gives less, it must duck or die. At a full crouch
 * the need (0.19) stays just under the cave's own minimum clearance (0.2), so a full crouch always fits — and the hair
 * under matters, because the crouch eases toward full and never quite arrives.
 */
const HEADROOM = 0.09;
/** Dropping further than this (screen heights) from where the feet left the ground kills. */
const FALL_DEATH = 1;
/** How long the cave cannot kill the figure after it comes back, in seconds: long enough to cross the hazard that killed it. */
const GRACE_TIME = 1.2;
const FAST = 1.9;
const SLOW = 0.3;
const GRAVITY = 3.4;
const LEAP = 1.35;

const approach = (v: number, target: number, rate: number, dt: number) => v + (target - v) * Math.min(1, rate * dt);

/** Where a death returns the figure: its last safe ground — walked forward to the first ground that still fits if the cave changed under it (a new song blends a new cave in), standing where it can, folded into a crouch where it cannot. */
function respawnAt(cave: Cave, from: number): { x: number; crouch: number } {
  const fits = (x: number, need: number) => cave.floorToothAt(x) < TOOTH_MIN && cave.floorAt(x) - cave.ceilingAt(x) >= need;
  for (let x = from; x < from + 3; x += 0.05) if (fits(x, STAND_HEIGHT + HEADROOM)) return { x, crouch: 0 };
  for (let x = from; x < from + 3; x += 0.05) if (fits(x, CROUCH_HEIGHT + HEADROOM)) return { x, crouch: 1 };
  return { x: from, crouch: 0 };
}

/** Death, when it comes: the count goes up, the moment starts, and the figure stops being run and starts falling. */
const kill = (r: Runner, cause: DeathCause): Runner => { r.death = { cause, t: 0 }; r.deaths += 1; return r; };

export function newRunner(cave: Cave, x = 0): Runner {
  return { x, y: cave.floorAt(x), vy: 0, speed: CRUISE, grounded: true, crouch: 0, phase: 0, idleFor: IDLE_TO_AUTO, leapCooldown: 0, deaths: 0, death: null, safeX: x, fallFrom: null, grace: GRACE_TIME };
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

/** `pace` scales the speed the figure is heading for (1 is its own): a journey asks for more to catch up with the song, less to wait for it. */
export function stepRunner(prev: Runner, dt: number, input: Input, cave: Cave, playing = true, pace = 1): Runner {
  const given = hasInput(input);

  // A death plays out first: the figure falls where it died, the controls do nothing to it, and after a breath it is back on
  // the last safe ground, standing, the song and the journey untouched. The death count is all a death costs, for now.
  if (prev.death) {
    const r = { ...prev, death: { cause: prev.death.cause, t: prev.death.t + dt } };
    r.idleFor = given ? 0 : Math.min(r.idleFor + dt, IDLE_TO_AUTO + 1);
    r.speed = approach(r.speed, 0, 4, dt);
    r.vy += GRAVITY * dt;
    r.y += r.vy * dt;
    if (r.death.t < DEATH_TIME) return r;
    const back = respawnAt(cave, r.safeX);
    return { ...r, x: back.x, y: cave.floorAt(back.x), vy: 0, speed: CRUISE, grounded: true, crouch: back.crouch, death: null, fallFrom: null, leapCooldown: 0, safeX: back.x, grace: GRACE_TIME };
  }

  const r = { ...prev };
  r.idleFor = given ? 0 : Math.min(r.idleFor + dt, IDLE_TO_AUTO + 1);
  r.grace = Math.max(0, prev.grace - dt);
  const canDie = r.grace <= 0;
  const auto = isAuto(r);
  r.leapCooldown = Math.max(0, r.leapCooldown - dt);

  // The pace. Steered: right is faster, left slower (it never runs backwards). On its own it cruises, a little faster across open
  // ground. Paused music slows it to a stroll. Speed always eases, so taking the controls never jerks it.
  let target = CRUISE;
  if (!auto) target = input.right ? FAST : input.left ? SLOW : CRUISE;
  else target = CRUISE * (0.92 + 0.16 * Math.sin(r.x * 0.21));
  if (!playing) target *= 0.25;
  target *= pace;
  r.speed = approach(r.speed, target, auto ? 0.8 : 2.4, dt);
  r.x += r.speed * dt;

  const floor = cave.floorAt(r.x);
  const ceiling = cave.ceilingAt(r.x);
  const ahead = (d: number) => ({ floor: cave.floorAt(r.x + d), ceiling: cave.ceilingAt(r.x + d) });

  // Crouch: the autopilot ducks under low ceilings by itself, looking well ahead — a ceiling tooth's edge falls faster
  // than the figure can fold, so the fold has to start early, and it unfolds gently (standing up is the dangerous
  // direction). A steering person gets no such courtesy — the assists stop playing for them, ducking is theirs to do
  // (down, held), and a passage they did not duck for is a hazard (below).
  const clearanceAt = (x: number) => cave.floorAt(x) - cave.ceilingAt(x);
  let low = clearanceAt(r.x);
  for (let d = 0.1; d <= 0.6; d += 0.1) low = Math.min(low, clearanceAt(r.x + d));
  const tight = low < STAND_HEIGHT + 0.12;
  const crouchTarget = (auto && tight) || (!auto && input.down && r.grounded) ? 1 : 0;
  r.crouch = approach(r.crouch, crouchTarget, crouchTarget > r.crouch ? 9 : 2.5, dt);

  // Leaping: when told to, or (on its own) when the ground ahead rises steeply. The autopilot will not leap where the arc
  // would land it on a floor tooth or carry its head into a ceiling tooth — running over the teeth is safer than landing
  // on them; a steering person's leap is theirs, consequences and all.
  const rise = floor - Math.min(ahead(0.18).floor, ahead(0.34).floor);
  const landing = r.x + r.speed * 0.8;
  const wantsLeap = auto
    ? rise > 0.07 && !tight
      && cave.floorToothAt(landing - 0.12) < TOOTH_MIN && cave.floorToothAt(landing) < TOOTH_MIN && cave.floorToothAt(landing + 0.12) < TOOTH_MIN
      && cave.ceilingToothAt(r.x + 0.35) < TOOTH_MIN && cave.ceilingToothAt(r.x + 0.55) < TOOTH_MIN
    : input.up;
  if (r.grounded && wantsLeap && r.leapCooldown === 0 && (!auto || !tight)) { r.vy = -LEAP; r.grounded = false; r.leapCooldown = 0.45; r.fallFrom = r.y; }

  if (r.grounded) {
    // Stick to the ground; if it falls away faster than the runner can follow, it leaves the ground and falls.
    if (floor - r.y > 0.05) { r.grounded = false; r.vy = 0; r.fallFrom = r.y; } else { r.y = floor; r.vy = 0; }
  }
  if (!r.grounded) {
    r.vy += GRAVITY * dt;
    r.y += r.vy * dt;
    // The fall rule: dropping more than a screen height from where the feet left the ground kills, mid-fall.
    if (canDie && r.fallFrom !== null && r.y - r.fallFrom > FALL_DEATH) return kill(r, 'fall');
    if (r.y >= floor) {
      // Landing on a floor tooth kills: the cave's floor teeth are broad bumps the figure walks over all day, and the
      // landing is the moment it meets one as a spike.
      if (canDie && cave.floorToothAt(r.x) >= TOOTH_MIN) return kill(r, 'teeth');
      r.y = floor; r.vy = 0; r.grounded = true; r.fallFrom = null;
    }
  }
  // The head meets the ceiling. A tooth there kills anyone, steered or not. Smooth rock kills a steering figure that rises
  // into it at speed — the soft stop is gone for them; anything gentler, and the autopilot's brushes, still stop softly.
  const head = r.y - heightOf(r);
  if (head < ceiling) {
    if (canDie && cave.ceilingToothAt(r.x) >= TOOTH_MIN) return kill(r, 'teeth');
    if (canDie && !auto && r.vy < -HEAD_KILL_SPEED) return kill(r, 'head');
    r.y = ceiling + heightOf(r); if (r.vy < 0) r.vy = 0;
  }
  if (r.y > floor) r.y = floor;

  if (r.grounded) {
    // A passage too low for the figure as it stands: its head meets the ceiling. Ducking was the survival; not ducking —
    // or not ducking enough — is this. (At a full crouch the need stays under the cave's minimum clearance, so it fits.)
    if (canDie && heightOf(r) + HEADROOM > floor - ceiling) return kill(r, cave.ceilingToothAt(r.x) >= TOOTH_MIN ? 'teeth' : 'head');
    // Safe ground, for coming back to: no tooth underfoot, and the figure fits here exactly as it is — crouched in a
    // crawl counts, so a death late in a crawl does not send it back to the crawl's mouth.
    if (cave.floorToothAt(r.x) < TOOTH_MIN && heightOf(r) + HEADROOM <= floor - ceiling) r.safeX = r.x;
  }

  r.phase += r.speed * dt * (r.grounded ? 9.5 : 3);
  return r;
}
