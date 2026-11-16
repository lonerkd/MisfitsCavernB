// The last few Production tools a person opened, kept on this device (a convenience, not account data).
export const RECENT_KEY = 'cavern.production.recentTools';
export const RECENT_MAX = 6;

/** Move `id` to the front, drop repeats and keep only the newest `max`. */
export function pushRecent(list: readonly string[], id: string, max = RECENT_MAX): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

/** Read the stored list, keeping only ids that are still real tools; never throws. */
export function readRecent(valid: readonly string[], storage?: Pick<Storage, 'getItem'>): string[] {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    const raw = store?.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && valid.includes(x)).slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

/** Store the list; a blocked or full storage is ignored (the row just will not persist). */
export function writeRecent(list: readonly string[], storage?: Pick<Storage, 'setItem'>): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    store?.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    /* device storage unavailable: nothing to do */
  }
}

// A tiny external store so React can read the list without a hydration mismatch (the server sees an empty list).
const listeners = new Set<() => void>();
const EMPTY: string[] = [];
let cache: { raw: string | null; list: string[] } | null = null;

function rawNow(): string | null {
  try { return typeof window !== 'undefined' ? window.localStorage.getItem(RECENT_KEY) : null; } catch { return null; }
}
export function subscribeRecent(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
/** The stable snapshot for useSyncExternalStore: the same array until the stored value changes. */
export function recentSnapshot(valid: readonly string[]): string[] {
  const raw = rawNow();
  if (cache && cache.raw === raw) return cache.list;
  const list = readRecent(valid);
  cache = { raw, list };
  return list;
}
export const recentServerSnapshot = (): string[] => EMPTY;
/** Note that `id` was just opened: it moves to the front and every subscriber hears of it. */
export function recordRecent(id: string, valid: readonly string[]): void {
  const prev = recentSnapshot(valid);
  if (prev[0] === id) return;
  const next = pushRecent(prev, id);
  writeRecent(next);
  cache = { raw: rawNow(), list: next };
  listeners.forEach((l) => l());
}
