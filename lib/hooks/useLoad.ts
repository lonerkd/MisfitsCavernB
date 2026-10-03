'use client';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';

export interface Loaded<T> {
  /** The latest answer (kept while a newer one loads), or undefined before the first. */
  data: T | undefined;
  /** No answer yet for the current key (or since the last reload()). */
  loading: boolean;
  /** What the latest load threw, if it did. */
  error: unknown;
  /** Loads again for the same key. */
  reload: () => void;
}

/**
 * Loads data for `key` — again whenever the key changes and on `reload()` —
 * and ignores answers to a key (or a load) that is no longer current. `null`
 * loads nothing. State changes only when an answer arrives, so "loading" is
 * derived rather than set before the request.
 */
export function useLoad<T>(key: string | null, load: () => Promise<T>): Loaded<T> {
  const [version, setVersion] = useState(0);
  const [answer, setAnswer] = useState<{ key: string; version: number; data?: T; error?: unknown } | null>(null);
  const run = useEffectEvent(load);

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    run().then(
      (data) => { if (alive) setAnswer({ key, version, data }); },
      (error) => { if (alive) setAnswer((a) => ({ key, version, data: a?.data, error })); },
    );
    return () => { alive = false; };
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return {
    data: answer?.data,
    loading: key !== null && (answer?.key !== key || answer.version !== version),
    error: answer?.key === key ? answer.error : undefined,
    reload,
  };
}
