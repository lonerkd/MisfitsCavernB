import { describe, expect, it, vi } from 'vitest';
import type { SyncStatus } from '@/lib/scriptos/storage';
import { syncActivity } from './syncActivity';

const NOW = 1_000_000;
const base: SyncStatus = { online: true, pending: 0, deletes: 0, syncing: false, attempts: 0, nextRetryAt: null };
const go = () => {};

describe('syncActivity', () => {
  it('has nothing to hold when nothing is waiting (plain offline is the island\'s own chip)', () => {
    expect(syncActivity(base, NOW, go)).toBeNull();
    expect(syncActivity({ ...base, online: false }, NOW, go)).toBeNull();
  });

  it('says what is saved on the device while offline, with no button (there is nothing to press)', () => {
    const activity = syncActivity({ ...base, online: false, pending: 2 }, NOW, go)!;
    expect(activity).toMatchObject({ id: 'sync', kind: 'sync', tone: 'warn', title: '2 scripts saved on this device', detail: 'Will sync when you reconnect' });
    expect(activity.controls).toBeUndefined();
  });

  it('counts scripts and deletes the way the editor\'s chip does', () => {
    expect(syncActivity({ ...base, online: false, pending: 1, deletes: 2 }, NOW, go)!.title).toBe('1 script + 2 deletes saved on this device');
  });

  it('says it is syncing while it is', () => {
    expect(syncActivity({ ...base, pending: 1, syncing: true }, NOW, go)).toMatchObject({ tone: 'busy', title: 'Syncing 1 script…' });
  });

  it('counts down to the retry and offers "Sync now" when online and waiting', () => {
    const run = vi.fn();
    const activity = syncActivity({ ...base, pending: 1, nextRetryAt: NOW + 12_000 }, NOW, run)!;
    expect(activity).toMatchObject({ tone: 'warn', title: '1 script waiting to sync', detail: 'Retry in 12 s' });
    expect(activity.controls).toEqual([{ id: 'sync-now', label: 'Sync now', run }]);
  });

  it('turns to an error once the server has been tried and not reached', () => {
    const activity = syncActivity({ ...base, pending: 2, attempts: 2, nextRetryAt: NOW + 61_000 }, NOW, go)!;
    expect(activity).toMatchObject({ tone: 'error', title: 'Can’t reach the server — 2 scripts waiting', detail: 'Retry in 2 min' });
    expect(activity.controls).toHaveLength(1);
  });

  it('says nothing about a retry when none is scheduled', () => {
    expect(syncActivity({ ...base, pending: 1 }, NOW, go)!.detail).toBeUndefined();
  });
});
