// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

const sent: string[] = [];
vi.mock('./index', () => ({
  studio: {
    updateShot: vi.fn(async (id: string) => { sent.push(`shot:${id}`); }),
    updateScene: vi.fn(async (id: string) => { sent.push(`scene:${id}`); }),
    addSetLog: vi.fn(), updateSetLog: vi.fn(), deleteSetLog: vi.fn(),
  },
}));

import { useOnSetSync } from './useOnSetSync';
import { saveQueue, loadQueue, type OnSetOp } from './onset-offline';

// Unmount what each test rendered (no Vitest globals, so Testing Library can't do it itself).
afterEach(cleanup);

const shot = (id: string): OnSetOp => ({ kind: 'shot', id, status: 'got' as never });
const opts = () => ({ reload: vi.fn(async () => {}), onRefused: vi.fn() });
const setOnline = (on: boolean) => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => on });

afterEach(() => { localStorage.clear(); sent.length = 0; setOnline(true); });

describe('useOnSetSync', () => {
  it('counts what this device saved for each project, switching with the project', () => {
    setOnline(false);
    saveQueue('p1', [shot('a'), shot('b')]);
    saveQueue('p2', [shot('c')]);
    const { result, rerender } = renderHook(({ p }) => useOnSetSync(p, opts()), { initialProps: { p: 'p1' } });
    expect(result.current.pending).toBe(2);
    rerender({ p: 'p2' });
    expect(result.current.pending).toBe(1);
  });

  it('queues a change made offline, and sends the queue in order once back online', async () => {
    setOnline(false);
    const o = opts();
    const { result } = renderHook(() => useOnSetSync('p1', o));
    const live = vi.fn(async () => {});
    await act(async () => { expect(await result.current.run(shot('a'), live)).toBe('queued'); });
    await act(async () => { await result.current.run(shot('b'), live); });
    expect(live).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(2);
    expect(loadQueue('p1')).toHaveLength(2);

    setOnline(true);
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(result.current.pending).toBe(0));
    expect(sent).toEqual(['shot:a', 'shot:b']);
    expect(o.reload).toHaveBeenCalled();
    expect(loadQueue('p1')).toEqual([]);
  });

  it('sends straight through when online with nothing waiting', async () => {
    const { result } = renderHook(() => useOnSetSync('p1', opts()));
    const live = vi.fn(async () => {});
    await act(async () => { expect(await result.current.run(shot('a'), live)).toBe('sent'); });
    expect(live).toHaveBeenCalledOnce();
    expect(result.current.pending).toBe(0);
  });
});
