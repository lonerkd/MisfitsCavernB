// Counts which deck keys get used, on this device only (localStorage; nothing is sent anywhere), so the ten-slot fast path
// can be tuned from use. Read it in the console: `JSON.parse(localStorage.getItem('mc_island_key_use'))`.

const KEY = 'mc_island_key_use';

export type KeyUse = Record<string, number>;

export function readKeyUse(storage: Pick<Storage, 'getItem'> = localStorage): KeyUse {
  try {
    const v = JSON.parse(storage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as KeyUse) : {};
  } catch { return {}; }
}

/** Count one press of `key` for the control `id` (stored as "key:id"). Never throws. */
export function countKeyUse(key: string, id: string, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): void {
  try {
    const use = readKeyUse(storage);
    const k = `${key}:${id}`;
    use[k] = (use[k] ?? 0) + 1;
    storage.setItem(KEY, JSON.stringify(use));
  } catch { /* private window or full storage: counting is optional */ }
}
