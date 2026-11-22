// A writer's dismissed character warnings ("this is on purpose"). Kept on THIS device (localStorage, per script): a dismissal is a quiet
// convenience, not project data, and the project's shared settings are writable by its owner alone, so a co-writer could not use them.
// Nothing here throws: a full or blocked store just means the warning comes back.

const keyOf = (scriptKey: string) => `mc.charwarn.dismissed.${scriptKey}`;

type Store = Pick<Storage, 'getItem' | 'setItem'>;
const defaultStore = (): Store | null => { try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; } };

export function readDismissed(scriptKey: string, store: Store | null = defaultStore()): Set<string> {
  if (!scriptKey || !store) return new Set();
  try {
    const raw = JSON.parse(store.getItem(keyOf(scriptKey)) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []);
  } catch { return new Set(); }
}

export function writeDismissed(scriptKey: string, ids: Set<string>, store: Store | null = defaultStore()): boolean {
  if (!scriptKey || !store) return false;
  try { store.setItem(keyOf(scriptKey), JSON.stringify([...ids].slice(0, 500))); return true; } catch { return false; }
}
