// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { readDeviceValue, useDeviceValue, writeDeviceValue } from './useDeviceValue';

// Unmount what each test rendered (no Vitest globals, so Testing Library can't do it itself).
afterEach(cleanup);

afterEach(() => localStorage.clear());

describe('useDeviceValue', () => {
  it('reads what is saved, and null for nothing or a null key', () => {
    localStorage.setItem('k', 'on');
    expect(renderHook(() => useDeviceValue('k')).result.current).toBe('on');
    expect(renderHook(() => useDeviceValue('missing')).result.current).toBeNull();
    expect(renderHook(() => useDeviceValue(null)).result.current).toBeNull();
  });

  it('a write updates every reader', () => {
    const a = renderHook(() => useDeviceValue('k'));
    const b = renderHook(() => useDeviceValue('k'));
    act(() => writeDeviceValue('k', 'one'));
    expect(a.result.current).toBe('one');
    expect(b.result.current).toBe('one');
    expect(readDeviceValue('k')).toBe('one');
  });

  it('writing null forgets the value', () => {
    localStorage.setItem('k', 'x');
    const { result } = renderHook(() => useDeviceValue('k'));
    act(() => writeDeviceValue('k', null));
    expect(result.current).toBeNull();
    expect(localStorage.getItem('k')).toBeNull();
  });

  it('follows another tab (the storage event)', () => {
    const { result } = renderHook(() => useDeviceValue('k'));
    act(() => {
      localStorage.setItem('k', 'from another tab');
      window.dispatchEvent(new StorageEvent('storage', { key: 'k' }));
    });
    expect(result.current).toBe('from another tab');
  });

  it('switching key reads the new key', () => {
    localStorage.setItem('a', 'A');
    localStorage.setItem('b', 'B');
    const { result, rerender } = renderHook(({ k }) => useDeviceValue(k), { initialProps: { k: 'a' } });
    expect(result.current).toBe('A');
    rerender({ k: 'b' });
    expect(result.current).toBe('B');
  });
});
