// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ProjectSignals } from '@/lib/os/progress';

const fetchProjectSignals = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/progress', () => ({ fetchProjectSignals, PROGRESS_EVENT: 'progress-change' }));
vi.mock('@/lib/os/uiPrefs', () => ({ useUiPrefs: () => ({ prefs: { show_all_tools: false } }) }));
vi.mock('@/lib/os/progress', async (orig) => ({
  ...(await orig<typeof import('@/lib/os/progress')>()),
  computeProgress: () => ({ computed: true }),
}));

import { useProjectProgress } from './useProjectProgress';

const signals = { unlock_all: false } as unknown as ProjectSignals;

beforeEach(() => { vi.useFakeTimers(); fetchProjectSignals.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('useProjectProgress retries', () => {
  it('retries with 1s, 2s, 4s backoff and recovers without showing an error', async () => {
    fetchProjectSignals
      .mockRejectedValueOnce(new Error('net'))
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce(signals);
    const { result } = renderHook(() => useProjectProgress('p1'));
    await act(async () => {});
    expect(fetchProjectSignals).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(999); });
    expect(fetchProjectSignals).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fetchProjectSignals).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(fetchProjectSignals).toHaveBeenCalledTimes(3);
    expect(result.current).toMatchObject({ error: null, loading: false, signals });
  });

  it('shows the error only after the last retry fails', async () => {
    fetchProjectSignals.mockRejectedValue(new Error('still down'));
    const { result } = renderHook(() => useProjectProgress('p1'));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000 + 2000 + 3999); });
    expect(fetchProjectSignals).toHaveBeenCalledTimes(3);
    expect(result.current.error).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fetchProjectSignals).toHaveBeenCalledTimes(4);
    expect(result.current.error).toBe('still down');
  });

  it('stops retrying after unmount', async () => {
    fetchProjectSignals.mockRejectedValue(new Error('net'));
    const { unmount } = renderHook(() => useProjectProgress('p1'));
    await act(async () => {});
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(fetchProjectSignals).toHaveBeenCalledTimes(1);
  });

  it('a newer reload supersedes a pending retry', async () => {
    fetchProjectSignals.mockRejectedValueOnce(new Error('net')).mockResolvedValue(signals);
    const { result } = renderHook(() => useProjectProgress('p1'));
    await act(async () => {});
    await act(async () => { await result.current.reload(); });
    expect(result.current.signals).toBe(signals);
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(fetchProjectSignals).toHaveBeenCalledTimes(2);
  });
});
