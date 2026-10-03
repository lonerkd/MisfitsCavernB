// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

// Unmount what each test rendered (no Vitest globals, so Testing Library can't do it itself).
afterEach(cleanup);

/** A matchMedia whose answer the test controls. */
function fakeMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    media: query,
    get matches() { return matches; },
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  }));
  return {
    set(next: boolean) { matches = next; listeners.forEach((l) => l()); },
    listeners,
  };
}

const original = window.matchMedia;
afterEach(() => { window.matchMedia = original; });

describe('useMediaQuery', () => {
  it('reports the query and follows changes', () => {
    const mq = fakeMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 760px)'));
    expect(result.current).toBe(false);
    act(() => mq.set(true));
    expect(result.current).toBe(true);
  });

  it('stops listening when unmounted', () => {
    const mq = fakeMatchMedia(true);
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 760px)'));
    expect(mq.listeners.size).toBe(1);
    unmount();
    expect(mq.listeners.size).toBe(0);
  });
});
