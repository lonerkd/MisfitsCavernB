'use client';
import { useSyncExternalStore } from 'react';

// Values saved on this device (localStorage), read while rendering and kept
// current: a write here re-renders every reader, and other tabs' writes arrive
// through the storage event.
const EVENT = 'mc-device-value';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(EVENT, onChange);
  return () => { window.removeEventListener('storage', onChange); window.removeEventListener(EVENT, onChange); };
}

export function readDeviceValue(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** Saves (or, with null, forgets) a value on this device and tells its readers. */
export function writeDeviceValue(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(EVENT));
}

/** The value saved under `key` on this device; null when there is none, for a null key, and while the server renders and the page hydrates. */
export function useDeviceValue(key: string | null): string | null {
  return useSyncExternalStore(subscribe, () => (key ? readDeviceValue(key) : null), () => null);
}
