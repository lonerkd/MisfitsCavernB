// The island's size: a per-device preference (Settings › Appearance), kept in
// localStorage. The key and event keep their older "taskbar" names so a size
// someone already chose carries over.

export const ISLAND_SCALE_KEY = 'mc_taskbar_scale';
export const ISLAND_SCALE_EVENT = 'mc-taskbar-scale-change';
export const ISLAND_SCALE_MIN = 0.8;
export const ISLAND_SCALE_MAX = 1.3;
export const ISLAND_SCALE_STEP = 0.05;

/** A usable size from whatever was stored: 1 when missing or junk, held within the slider's range. */
export function clampIslandScale(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (!Number.isFinite(n)) return 1;
  return Math.min(ISLAND_SCALE_MAX, Math.max(ISLAND_SCALE_MIN, Math.round(n * 100) / 100));
}

export function readIslandScale(): number {
  try { return clampIslandScale(localStorage.getItem(ISLAND_SCALE_KEY)); } catch { return 1; }
}

/** Saves the size on this device and tells the island, which resizes at once. */
export function writeIslandScale(value: number): number {
  const scale = clampIslandScale(value);
  try { localStorage.setItem(ISLAND_SCALE_KEY, String(scale)); } catch {}
  window.dispatchEvent(new Event(ISLAND_SCALE_EVENT));
  return scale;
}

/** The gap under the island, and the air pages leave above it. */
const GAP_BELOW = 14;
const AIR_ABOVE = 8;
/** The resting pill at size 1, border included. */
const PILL = 42;

/** Room pages leave for the resting island (--taskbar-height), in px: 64 at size 1. */
export function islandReserve(scale: number): number {
  return Math.round(GAP_BELOW + PILL * clampIslandScale(scale) + AIR_ABOVE);
}
