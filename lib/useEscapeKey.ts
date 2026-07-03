'use client';

import { useEffect } from 'react';

// Close a modal/overlay when Escape is pressed. Pass the handler; it's active
// only while `enabled` is true (default true).
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape, enabled]);
}
