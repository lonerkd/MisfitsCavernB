'use client';

import { useEffect, useState } from 'react';

/** How long the context pill stays expanded after the context changes. */
export const CONTEXT_SHOW_MS = 2800;

/**
 * The context shape of the island is a moment, not a place: it expands when the
 * context changes (`key`: where you are and what is under the pointer) and
 * goes back to rest on its own. It holds while the island is engaged (pointer
 * on it, focus in it) and starts its time again when that ends; Escape puts it
 * away at once. `key` empty = no context, nothing to show.
 *
 * Returns true while the context shape may be shown.
 */
export function useTransientContext(key: string, engaged: boolean, ms: number = CONTEXT_SHOW_MS): boolean {
  // The key a timeout or Escape put away; a new key (or none) shows again.
  const [putAway, setPutAway] = useState<string | null>(null);

  useEffect(() => {
    if (!key || engaged || putAway === key) return;
    const t = setTimeout(() => setPutAway(key), ms);
    return () => clearTimeout(t);
  }, [key, engaged, putAway, ms]);

  useEffect(() => {
    if (!key) { setPutAway(null); return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPutAway(key); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key]);

  return !!key && putAway !== key;
}
