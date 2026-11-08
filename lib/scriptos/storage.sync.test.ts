// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { idb, server } = vi.hoisted(() => ({
  idb: new Map<string, any>(),
  server: {
    upsert: vi.fn(async (_rows?: unknown) => ({ error: null as any })),
    del: vi.fn(async (_id?: string) => ({ error: null as any })),
  },
}));

vi.mock('idb-keyval', () => ({
  get: async (k: string) => idb.get(k),
  set: async (k: string, v: any) => { idb.set(k, structuredClone(v)); },
  del: async (k: string) => { idb.delete(k); },
  keys: async () => [...idb.keys()],
}));

vi.mock('@/lib/os', () => ({
  awaitOSUser: async () => ({ id: 'user-1', email: 'sam@example.com' }),
  osState: () => ({ project: { active: null } }),
  SCRIPT_POINTER_PREFIX: 'mc_active_script:',
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      upsert: server.upsert,
      delete: () => ({ eq: (_c: string, id: string) => server.del(id) }),
    }),
  },
}));

import {
  getSyncStatus, refreshSyncStatus, retryDelayMs, scheduleScriptSync, syncPendingScripts, deleteScript, saveScript,
} from './storage';
import { scriptTextStateKey } from './cowriting';

const pendingScript = (id: string, updatedAt = 'T1') => ({
  id, title: 'Draft', content: 'text', createdAt: 'T0', updatedAt, user_id: 'user-1', syncPending: true,
});
const fail = { error: { message: 'network down' } };

beforeEach(() => {
  vi.useFakeTimers();
  idb.clear();
  server.upsert.mockReset().mockResolvedValue({ error: null });
  server.del.mockReset().mockResolvedValue({ error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  // Drain any waiting retry so one test's timer can't leak into the next.
  server.upsert.mockResolvedValue({ error: null });
  idb.clear();
  await syncPendingScripts();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('retryDelayMs', () => {
  it('doubles from 15 s and caps at 5 min', () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(retryDelayMs)).toEqual([15000, 30000, 60000, 120000, 240000, 300000, 300000]);
  });
});

describe('sync status — the offline queue the footer shows', () => {
  it('preserves format and project when saving partial offline edits', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    idb.set('script_s1', {
      ...pendingScript('old text'),
      format: 'copy',
      project_id: 'project-1',
    });

    const saved = await saveScript({ id: 's1', title: 'Draft', content: 'new text' });
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    expect(saved).toMatchObject({
      format: 'copy',
      project_id: 'project-1',
      content: 'new text',
      syncPending: true,
    });
    expect(idb.get('script_s1')).toMatchObject({
      format: 'copy',
      project_id: 'project-1',
      content: 'new text',
      syncPending: true,
    });
  });

  it('counts pending scripts and offline deletes', async () => {
    idb.set('script_a', pendingScript('a'));
    idb.set('script_b', { ...pendingScript('b'), syncPending: false });
    idb.set('mc_deleted_scripts', ['x', 'y']);
    await refreshSyncStatus();
    expect(getSyncStatus()).toMatchObject({ pending: 1, deletes: 2 });
  });

  it('a clean pass empties the queue and resets the failure count', async () => {
    idb.set('script_a', pendingScript('a'));
    await syncPendingScripts();
    expect(getSyncStatus()).toMatchObject({ pending: 0, syncing: false, attempts: 0, nextRetryAt: null });
  });

  it('sends a queued script format to the server', async () => {
    idb.set('script_s1', {
      ...pendingScript('copy text'),
      format: 'copy',
      project_id: 'project-1',
    });

    await syncPendingScripts();

    expect(server.upsert).toHaveBeenCalledWith([
      expect.objectContaining({ format: 'copy', project_id: 'project-1' }),
    ]);
  });

  it('a failed pass keeps the script pending and schedules a retry with backoff', async () => {
    idb.set('script_a', pendingScript('a'));
    server.upsert.mockResolvedValue(fail);

    await syncPendingScripts();
    expect(getSyncStatus()).toMatchObject({ pending: 1, attempts: 1 });
    expect(getSyncStatus().nextRetryAt).toBe(Date.now() + 15000);

    await vi.advanceTimersByTimeAsync(15000); // the retry fires, fails again
    expect(server.upsert).toHaveBeenCalledTimes(2);
    expect(getSyncStatus().attempts).toBe(2);
    expect(getSyncStatus().nextRetryAt).toBe(Date.now() + 30000);
  });

  it('the retry that follows an outage succeeds and clears the countdown', async () => {
    idb.set('script_a', pendingScript('a'));
    server.upsert.mockResolvedValueOnce(fail);
    await syncPendingScripts();

    await vi.advanceTimersByTimeAsync(15000);
    expect(getSyncStatus()).toMatchObject({ pending: 0, attempts: 0, nextRetryAt: null });
    expect(idb.get('script_a').syncPending).toBe(false);
  });

  it('the online event cancels a waiting retry and syncs now', async () => {
    idb.set('script_a', pendingScript('a'));
    server.upsert.mockResolvedValueOnce(fail);
    await syncPendingScripts();
    expect(getSyncStatus().nextRetryAt).not.toBeNull();

    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(server.upsert).toHaveBeenCalledTimes(2); // synced immediately, not after 15 s
    expect(getSyncStatus()).toMatchObject({ pending: 0, nextRetryAt: null, online: true });

    await vi.advanceTimersByTimeAsync(60000); // the cancelled timer must not fire again
    expect(server.upsert).toHaveBeenCalledTimes(2);
  });

  it('follows the browser going offline and back', () => {
    window.dispatchEvent(new Event('offline'));
    expect(getSyncStatus().online).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(getSyncStatus().online).toBe(true);
  });

  it('scheduleScriptSync publishes when it will run, and only one timer waits at a time', async () => {
    idb.set('script_a', pendingScript('a'));
    scheduleScriptSync(5000);
    scheduleScriptSync(1000); // ignored: one is already waiting
    expect(getSyncStatus().nextRetryAt).toBe(Date.now() + 5000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(server.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('offline deletes (tombstones)', () => {
  it('a delete made offline is replayed, then cleared from the queue', async () => {
    idb.set('script_a', pendingScript('a'));
    idb.set(scriptTextStateKey('a'), { state: [1, 2, 3], baseContent: 'text' });
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await deleteScript('a');
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    expect(idb.has('script_a')).toBe(false); // the text is gone from the device at once
    expect(idb.has(scriptTextStateKey('a'))).toBe(false);
    expect(getSyncStatus().deletes).toBe(1);

    await syncPendingScripts();
    expect(server.del).toHaveBeenCalledWith('a');
    expect(server.upsert).not.toHaveBeenCalled(); // the deleted draft is never re-uploaded
    expect(getSyncStatus().deletes).toBe(0);
  });

  it('a delete the server refuses stays queued and counts as a failed pass', async () => {
    idb.set('mc_deleted_scripts', ['a']);
    server.del.mockResolvedValue(fail);

    await syncPendingScripts();

    expect(idb.get('mc_deleted_scripts')).toEqual(['a']);
    expect(getSyncStatus()).toMatchObject({ deletes: 1, attempts: 1 });
    expect(getSyncStatus().nextRetryAt).not.toBeNull();
  });
});
