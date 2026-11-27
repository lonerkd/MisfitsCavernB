// The film grain over everything: a per-device preference (Settings ›
// Appearance), kept in localStorage like the island's size. Two dials — how
// much grain there is, and how fast it dances. The defaults are the look the
// suite has always shipped: opacity 0.025, a 0.5s cycle.

export const GRAIN_AMOUNT_KEY = 'mc_grain_amount';
export const GRAIN_SPEED_KEY = 'mc_grain_speed';
export const GRAIN_EVENT = 'mc-grain-change';

/** The grain's strength is the overlay's opacity: nothing at 0, full strength at 0.08. */
export const GRAIN_AMOUNT_MIN = 0;
export const GRAIN_AMOUNT_MAX = 0.08;
export const GRAIN_AMOUNT_STEP = 0.0025;
export const GRAIN_AMOUNT_DEFAULT = 0.025;

/** Speed is a multiplier on the stock cadence: 1 is the 0.5s cycle the suite
 * has always run, 0.25 slows it to a 2s drift, 3 runs it frantic at ~0.17s. */
export const GRAIN_SPEED_MIN = 0.25;
export const GRAIN_SPEED_MAX = 3;
export const GRAIN_SPEED_STEP = 0.05;
export const GRAIN_SPEED_DEFAULT = 1;
export const GRAIN_CYCLE_SECONDS = 0.5;

/** A usable amount from whatever was stored: the default when missing or junk, held within the slider's range. */
export function clampGrainAmount(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (!Number.isFinite(n)) return GRAIN_AMOUNT_DEFAULT;
  return Math.min(GRAIN_AMOUNT_MAX, Math.max(GRAIN_AMOUNT_MIN, Math.round(n * 10000) / 10000));
}

/** A usable speed from whatever was stored: 1 when missing or junk, held within the slider's range. */
export function clampGrainSpeed(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (!Number.isFinite(n)) return GRAIN_SPEED_DEFAULT;
  return Math.min(GRAIN_SPEED_MAX, Math.max(GRAIN_SPEED_MIN, Math.round(n * 100) / 100));
}

/** The animation's cycle in seconds for a speed: the stock 0.5s divided by the multiplier. */
export function grainCycleSeconds(speed: unknown): number {
  return Math.round((GRAIN_CYCLE_SECONDS / clampGrainSpeed(speed)) * 1000) / 1000;
}

export function readGrainAmount(): number {
  try { return clampGrainAmount(localStorage.getItem(GRAIN_AMOUNT_KEY)); } catch { return GRAIN_AMOUNT_DEFAULT; }
}

export function readGrainSpeed(): number {
  try { return clampGrainSpeed(localStorage.getItem(GRAIN_SPEED_KEY)); } catch { return GRAIN_SPEED_DEFAULT; }
}

/** Both dials at once, as the overlay wants them. */
export function readGrain(): { amount: number; speed: number } {
  return { amount: readGrainAmount(), speed: readGrainSpeed() };
}

/** Saves the amount on this device and tells the overlay, which answers at once. */
export function writeGrainAmount(value: number): number {
  const amount = clampGrainAmount(value);
  try { localStorage.setItem(GRAIN_AMOUNT_KEY, String(amount)); } catch {}
  window.dispatchEvent(new Event(GRAIN_EVENT));
  return amount;
}

/** Saves the speed on this device and tells the overlay, which answers at once. */
export function writeGrainSpeed(value: number): number {
  const speed = clampGrainSpeed(value);
  try { localStorage.setItem(GRAIN_SPEED_KEY, String(speed)); } catch {}
  window.dispatchEvent(new Event(GRAIN_EVENT));
  return speed;
}
