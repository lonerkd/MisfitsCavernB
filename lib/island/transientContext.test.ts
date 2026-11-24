// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { CONTEXT_SHOW_MS, useTransientContext } from './transientContext';

type P = { key: string; engaged: boolean };
const setup = (p: P) => renderHook((q: P) => useTransientContext(q.key, q.engaged), { initialProps: p });

describe('useTransientContext', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('shows on a context and goes back after the time', () => {
    const { result } = setup({ key: 'Studio › Library', engaged: false });
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(CONTEXT_SHOW_MS - 1); });
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(2); });
    expect(result.current).toBe(false);
  });

  it('shows nothing with no context', () => {
    expect(setup({ key: '', engaged: false }).result.current).toBe(false);
  });

  it('a changed context shows again and restarts the time', () => {
    const { result, rerender } = setup({ key: 'a', engaged: false });
    act(() => { vi.advanceTimersByTime(CONTEXT_SHOW_MS + 1); });
    expect(result.current).toBe(false);
    rerender({ key: 'b', engaged: false });
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(CONTEXT_SHOW_MS + 1); });
    expect(result.current).toBe(false);
  });

  it('holds while engaged and counts again afterwards', () => {
    const { result, rerender } = setup({ key: 'a', engaged: true });
    act(() => { vi.advanceTimersByTime(CONTEXT_SHOW_MS * 3); });
    expect(result.current).toBe(true);
    rerender({ key: 'a', engaged: false });
    act(() => { vi.advanceTimersByTime(CONTEXT_SHOW_MS - 1); });
    expect(result.current).toBe(true);
    act(() => { vi.advanceTimersByTime(2); });
    expect(result.current).toBe(false);
  });

  it('Escape puts it away at once; leaving and re-entering the same context shows it again', () => {
    const { result, rerender } = setup({ key: 'a', engaged: false });
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(result.current).toBe(false);
    rerender({ key: '', engaged: false });
    rerender({ key: 'a', engaged: false });
    expect(result.current).toBe(true);
  });
});
