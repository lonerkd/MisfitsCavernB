// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useOnChange } from './useOnChange';

// Unmount what each test rendered (no Vitest globals, so Testing Library can't do it itself).
afterEach(cleanup);

/** A draft that follows `value`, recording what each render saw. */
function useDraft(value: string, seen: string[]) {
  const [draft, setDraft] = useState(value);
  useOnChange(value, (next) => setDraft(next));
  seen.push(draft);
  return draft;
}

describe('useOnChange', () => {
  it('does not fire on mount', () => {
    let calls = 0;
    renderHook(() => useOnChange('a', () => { calls++; }));
    expect(calls).toBe(0);
  });

  it('fires once per change, with the new and previous value', () => {
    const got: Array<[string, string]> = [];
    const { rerender } = renderHook(({ v }) => useOnChange(v, (next, prev) => got.push([next, prev])), { initialProps: { v: 'a' } });
    rerender({ v: 'a' });
    rerender({ v: 'b' });
    rerender({ v: 'b' });
    rerender({ v: 'c' });
    expect(got).toEqual([['b', 'a'], ['c', 'b']]);
  });

  it('adjusts state in the same render — no committed render shows the stale draft', () => {
    const seen: string[] = [];
    const { result, rerender } = renderHook(({ v }) => useDraft(v, seen), { initialProps: { v: 'one' } });
    rerender({ v: 'two' });
    expect(result.current).toBe('two');
    // React may run the discarded render (with 'one'), but what's returned is 'two'.
    expect(seen.at(-1)).toBe('two');
  });
});
