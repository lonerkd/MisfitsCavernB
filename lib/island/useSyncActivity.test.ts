// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import type { SyncStatus } from '@/lib/scriptos/storage';

const idle: SyncStatus = { online: true, pending: 0, deletes: 0, syncing: false, attempts: 0, nextRetryAt: null };
const h = vi.hoisted(() => ({
  status: null as unknown as SyncStatus,
  refresh: vi.fn(),
  syncNow: vi.fn(),
}));

vi.mock('@/lib/scriptos/storage', () => ({
  getSyncStatus: () => h.status,
  subscribeSyncStatus: () => () => {},
  refreshSyncStatus: h.refresh,
  syncPendingScripts: h.syncNow,
}));

import { activityStore } from './activities';
import { useSyncActivity } from './useSyncActivity';

beforeEach(() => { h.status = idle; h.refresh.mockReset(); h.refresh.mockResolvedValue(undefined); h.syncNow.mockReset(); h.syncNow.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); for (const x of activityStore.getSnapshot()) activityStore.clear(x.id); });

describe('useSyncActivity', () => {
  it('counts what is already waiting on the device when it mounts (a reload, or any page but the editor)', () => {
    renderHook(() => useSyncActivity());
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });

  it('holds nothing when nothing is waiting', () => {
    renderHook(() => useSyncActivity());
    expect(activityStore.getSnapshot()).toEqual([]);
  });

  it('holds the queue on the island while scripts are waiting, and lets go when the queue empties', () => {
    h.status = { ...idle, pending: 2 };
    const { rerender } = renderHook(() => useSyncActivity());
    expect(activityStore.getSnapshot().map((a) => a.title)).toEqual(['2 scripts waiting to sync']);
    h.status = idle;
    rerender();
    expect(activityStore.getSnapshot()).toEqual([]);
  });

  it('wires "Sync now" to the offline queue\'s own sync', () => {
    h.status = { ...idle, pending: 1 };
    renderHook(() => useSyncActivity());
    activityStore.getSnapshot()[0].controls![0].run();
    expect(h.syncNow).toHaveBeenCalledTimes(1);
  });

  it('lets go when the island goes away', () => {
    h.status = { ...idle, pending: 1 };
    const { unmount } = renderHook(() => useSyncActivity());
    expect(activityStore.getSnapshot()).toHaveLength(1);
    unmount();
    expect(activityStore.getSnapshot()).toEqual([]);
  });
});
