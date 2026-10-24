/**
 * A small in-memory cache for read-only loads: a successful answer is reused
 * for `ttlMs`, and callers asking for the same key while it loads share one
 * request. A failed load is never kept — the next call tries again — and it
 * rejects every caller that was sharing it, so the caller's own error handling
 * (`useLoad`'s `error`) sees it exactly as it would without the cache.
 * Lives in module memory: per tab, gone on reload.
 */
interface Entry { at: number; value: unknown }

const done = new Map<string, Entry>();
const pending = new Map<string, Promise<unknown>>();

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>, now: () => number = Date.now): Promise<T> {
  const hit = done.get(key);
  if (hit && now() - hit.at < ttlMs) return Promise.resolve(hit.value as T);

  const inFlight = pending.get(key);
  if (inFlight) return inFlight as Promise<T>;

  const request = load().then(
    (value) => {
      pending.delete(key);
      done.set(key, { at: now(), value });
      return value;
    },
    (error: unknown) => {
      pending.delete(key);
      done.delete(key);
      throw error;
    },
  );
  pending.set(key, request);
  return request;
}

/** Forgets one key, or everything. */
export function clearCache(key?: string): void {
  if (key === undefined) { done.clear(); pending.clear(); } else { done.delete(key); pending.delete(key); }
}
