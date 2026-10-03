'use client';
import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
};

/**
 * The address's query string (`location.search`), read during render without
 * a Suspense boundary: empty while the server renders and hydrates, the real
 * one straight after. Re-read on every render and on back/forward.
 */
export function useLocationSearch(): string {
  return useSyncExternalStore(subscribe, () => window.location.search, () => '');
}

/** One query parameter from the address (null until hydrated, or when absent). */
export function useSearchParam(name: string): string | null {
  const search = useLocationSearch();
  return search ? new URLSearchParams(search).get(name) : null;
}

const never = () => () => {};
/** False while the server renders and the page hydrates; true after. */
export function useHydrated(): boolean {
  return useSyncExternalStore(never, () => true, () => false);
}
