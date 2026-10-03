'use client';

import { useState } from 'react';

/**
 * Runs `onChange` while rendering when `value` changes (compared with
 * Object.is, like an effect's dependencies) — React's "adjust state when a
 * prop changes". Use it to reset or derive state from a new value without an
 * effect, which would render once with the stale state first. `onChange`
 * should only set state; anything else (the DOM, timers, the network) belongs
 * in an effect.
 */
export function useOnChange<T>(value: T, onChange: (next: T, prev: T) => void): void {
  const [prev, setPrev] = useState(value);
  if (!Object.is(prev, value)) {
    setPrev(value);
    onChange(value, prev);
  }
}
