// How a pointer or the keys become "where to go" in the dive. Pure, so the feel of the controls can be tested.
import type { Steer } from './dive';

/** A pointer this close to the centre of the cave is "no steering": a hand resting on the mouse does not drift the blob. */
export const DEADZONE = 0.1;

const shape = (n: number): number => {
  const a = Math.abs(n);
  if (a <= DEADZONE) return 0;
  // Past the dead zone it ramps from 0 to 1 with a gentle curve: fine control near the middle, full speed near the edge.
  return Math.sign(n) * Math.min(1, (a - DEADZONE) / (0.95 - DEADZONE)) ** 1.25;
};

/** `fx`, `fy`: where the pointer is in the canvas, 0..1 from its left and top. Up the screen is up the cave. */
export function pointerSteer(fx: number, fy: number): Steer {
  return { x: shape((fx - 0.5) * 2) || 0, z: shape((0.5 - fy) * 2) || 0 };
}

/** Held arrows or WASD as a steer, diagonals no faster than straight. */
export function keySteer(left: boolean, right: boolean, up: boolean, down: boolean): Steer {
  const diag = (left || right) && (up || down) ? Math.SQRT1_2 : 1;
  return { x: ((right ? 1 : 0) - (left ? 1 : 0)) * diag, z: ((up ? 1 : 0) - (down ? 1 : 0)) * diag };
}
