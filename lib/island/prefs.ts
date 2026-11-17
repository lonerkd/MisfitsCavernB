// Which of the island's states a person wants: a per-device choice (Settings › Appearance), kept in
// localStorage like the island's size. It switches states off, never the island itself: its menu,
// projects and tools stay, and a state that is off simply never takes the island's shape.
import type { IslandSignals } from './mode';

export type IslandStateKey = 'live' | 'context' | 'activity' | 'caps' | 'typing';
export type IslandPrefs = Record<IslandStateKey, boolean>;

export const ISLAND_PREFS_KEY = 'mc_island_states';
export const ISLAND_PREFS_EVENT = 'mc-island-states-change';
export const DEFAULT_ISLAND_PREFS: IslandPrefs = { live: true, context: true, activity: true, caps: true, typing: true };

export const ISLAND_STATE_LABELS: Array<{ key: IslandStateKey; label: string; hint: string }> = [
  { key: 'live', label: 'Brief notices', hint: 'Says so for a moment when something is saved, synced or switched.' },
  { key: 'context', label: 'Page controls', hint: 'Shows a page’s own controls when the pointer is on something that has them.' },
  { key: 'activity', label: 'Running things', hint: 'Holds a sprint, a call, music or the offline queue on the island until it ends.' },
  { key: 'caps', label: 'Caps Lock keys', hint: 'Caps Lock opens the deck with every control on a key.' },
  { key: 'typing', label: 'Dot while typing', hint: 'Shrinks to a dot while you type. Off: the island stays as it is.' },
];

/** A full set of choices from whatever was stored; anything missing or not a boolean stays on. */
export function toIslandPrefs(raw: unknown): IslandPrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_ISLAND_PREFS };
  for (const k of Object.keys(out) as IslandStateKey[]) if (r[k] === false) out[k] = false;
  return out;
}

/** The signals the island sees once the person's switches are applied. */
export function applyIslandPrefs(s: IslandSignals, p: IslandPrefs): IslandSignals {
  return { ...s, live: s.live && p.live, zone: s.zone && p.context, activity: s.activity && p.activity, caps: s.caps && p.caps, typing: s.typing && p.typing };
}

export function readIslandPrefs(): IslandPrefs {
  try { return toIslandPrefs(JSON.parse(localStorage.getItem(ISLAND_PREFS_KEY) ?? 'null')); } catch { return { ...DEFAULT_ISLAND_PREFS }; }
}

/** Saves on this device and tells the island at once. A blocked storage still applies for this page. */
export function writeIslandPrefs(p: IslandPrefs): IslandPrefs {
  const next = toIslandPrefs(p);
  try { localStorage.setItem(ISLAND_PREFS_KEY, JSON.stringify(next)); } catch {}
  window.dispatchEvent(new Event(ISLAND_PREFS_EVENT));
  return next;
}
