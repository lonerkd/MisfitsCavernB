import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory stand-ins: `idb` is the device store (IndexedDB), `server` the
// scripts table. Each test controls what the server returns and whether writes
// reach it.
const { idb, server } = vi.hoisted(() => ({
  idb: new Map<string, any>(),
  server: {
    rows: [] as any[],
    upsert: vi.fn(async () => ({ error: null as any })),
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
      select: () => ({ eq: () => ({ order: async () => ({ data: server.rows, error: null }) }) }),
      upsert: server.upsert,
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}));

import { getAllScripts, syncPendingScripts } from './storage';

const serverRow = (content: string) => ({
  id: 's1', title: 'Draft', content, created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z', created_by: 'user-1', project_id: null,
});
const localPending = (content: string, updatedAt = '2026-09-02T00:00:00Z') => ({
  id: 's1', title: 'Draft', content, createdAt: '2026-09-01T00:00:00Z',
  updatedAt, user_id: 'user-1', syncPending: true,
});

beforeEach(() => {
  idb.clear();
  server.rows = [];
  server.upsert.mockReset();
  server.upsert.mockResolvedValue({ error: null });
});

describe('script storage — unsynced writing is never lost', () => {
  it('shows unsynced local edits instead of the older server copy', async () => {
    server.rows = [serverRow('old server text')];
    idb.set('script_s1', localPending('new local text'));

    const [script] = await getAllScripts();

    expect(script.content).toBe('new local text');
    expect(script.syncPending).toBe(true);
    // …and the device copy is left intact, not overwritten by the server's.
    expect(idb.get('script_s1').content).toBe('new local text');
  });

  it('uses the server copy when nothing is pending locally', async () => {
    server.rows = [serverRow('server text')];
    idb.set('script_s1', { ...localPending('stale local'), syncPending: false });

    const [script] = await getAllScripts();

    expect(script.content).toBe('server text');
  });

  it('does not clobber text written while a sync was in flight', async () => {
    idb.set('script_s1', localPending('first draft', 'T1'));
    server.upsert.mockImplementation(async () => {
      // The writer keeps typing while the upload is in flight.
      idb.set('script_s1', localPending('second draft', 'T2'));
      return { error: null };
    });

    await syncPendingScripts();

    const local = idb.get('script_s1');
    expect(local.content).toBe('second draft');
    expect(local.syncPending).toBe(true); // still needs its own sync
  });

  it('clears the pending flag once the server has the latest text', async () => {
    idb.set('script_s1', localPending('final draft', 'T1'));

    await syncPendingScripts();

    expect(server.upsert).toHaveBeenCalledTimes(1);
    expect(idb.get('script_s1').syncPending).toBe(false);
  });
});
