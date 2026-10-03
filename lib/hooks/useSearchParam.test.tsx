// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useHydrated, useLocationSearch, useSearchParam } from './useSearchParam';

// Unmount what each test rendered (no Vitest globals, so Testing Library can't do it itself).
afterEach(cleanup);

afterEach(() => window.history.replaceState(null, '', '/'));

describe('useSearchParam', () => {
  it('reads a parameter from the address', () => {
    window.history.replaceState(null, '', '/lounge?channel=abc&dm=');
    expect(renderHook(() => useSearchParam('channel')).result.current).toBe('abc');
    expect(renderHook(() => useSearchParam('dm')).result.current).toBe('');
    expect(renderHook(() => useSearchParam('nope')).result.current).toBeNull();
    expect(renderHook(() => useLocationSearch()).result.current).toBe('?channel=abc&dm=');
  });

  it('follows back/forward (popstate)', () => {
    window.history.replaceState(null, '', '/studio?tab=overview');
    const { result } = renderHook(() => useSearchParam('tab'));
    expect(result.current).toBe('overview');
    act(() => {
      window.history.replaceState(null, '', '/studio?tab=library');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current).toBe('library');
  });

  it('is hydrated once rendering in the browser', () => {
    expect(renderHook(() => useHydrated()).result.current).toBe(true);
  });
});
