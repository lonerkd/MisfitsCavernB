'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Auto-save form drafts to localStorage so input isn't lost on navigation.
 * Returns [value, setValue, clearDraft] — value is restored from localStorage on mount.
 */
export function useDraft<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValueState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const saved = localStorage.getItem(`draft:${key}`);
      if (saved) return JSON.parse(saved) as T;
    } catch { /* ignore */ }
    return initial;
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setValue = useCallback((v: T | ((prev: T) => T)) => {
    setValueState((prev) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      // Debounce save
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        try { localStorage.setItem(`draft:${key}`, JSON.stringify(next)); } catch { /* ignore */ }
      }, 500);
      return next;
    });
  }, [key]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(`draft:${key}`); } catch { /* ignore */ }
    setValueState(initial);
  }, [key, initial]);

  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  return [value, setValue, clearDraft];
}
