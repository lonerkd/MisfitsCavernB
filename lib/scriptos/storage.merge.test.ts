// @vitest-environment jsdom
// The offline queue meeting a collaborator's edits: a script the device holds a shared document for is merged
// with the server's, not written over it (the plain upload erased the other writer's words).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';

const { idb, server } = vi.hoisted(() => ({
  idb: new Map<string, any>(),
  server: {
    upsert: vi.fn(async (_rows?: unknown) => ({ error: null as any })),
    read: vi.fn(async () => ({ data: null as any, error: null as any })),
    write: vi.fn(async (_patch?: any, _where?: any) => ({ data: [{ id: 's1' }] as any, error: null as any })),
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
      delete: () => ({ eq: async () => ({ error: null }) }),
      select: () => ({ eq: () => ({ maybeSingle: () => server.read() }) }),
      update: (patch: any) => ({
        // .eq('id', …) then optionally .eq('updated_at', …), then .select('id')
        eq: () => ({
          eq: (_column: string, value: string) => ({ select: () => server.write(patch, value) }),
          select: () => server.write(patch, undefined),
        }),
      }),
    }),
  },
}));

import { getSyncStatus, syncPendingScripts } from './storage';
import {
  decodeScriptTextUpdate, encodeScriptTextState, encodeScriptTextUpdate, SCRIPT_TEXT_FIELD, scriptTextStateKey, seedScriptText,
  type PersistedScriptText,
} from './cowriting';

const BASE = 'INT. KITCHEN - NIGHT\n\nMAYA\nStill up.\n\nEXT. PIER - DAY\n\nBoats come in.\n';

/** A copy of the script with one edit made, the way a device (or the server) holds it. */
const edited = (anchor: string, add: string) => {
  const doc = new Y.Doc();
  seedScriptText(doc, BASE);
  const text = doc.getText(SCRIPT_TEXT_FIELD);
  text.insert(text.toString().indexOf(anchor) + anchor.length, add);
  return doc;
};
const textOf = (encoded: string) => {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, decodeScriptTextUpdate(encoded)!);
  return doc.getText(SCRIPT_TEXT_FIELD).toString();
};

const offlineDoc = () => edited('Still up.', ' Alpha was offline.');
const collaboratorState = () => encodeScriptTextUpdate(edited('Boats come in.', ' Bravo stayed online.'));

/** The device after the writer typed offline: the queued script and its saved shared document. */
function queueOfflineScript(doc = offlineDoc(), over: Record<string, unknown> = {}) {
  idb.set('script_s1', { id: 's1', title: 'Kitchen', content: doc.getText(SCRIPT_TEXT_FIELD).toString(), createdAt: 'T0', updatedAt: 'T1', user_id: 'user-1', syncPending: true, ...over });
  idb.set(scriptTextStateKey('s1'), encodeScriptTextState(doc, BASE));
}
const serverHolds = (yjsState: string | null, updatedAt: string | null = 'S1') => server.read.mockResolvedValue({ data: { yjs_state: yjsState, updated_at: updatedAt }, error: null });

beforeEach(() => {
  vi.useFakeTimers();
  idb.clear();
  server.upsert.mockReset().mockResolvedValue({ error: null });
  server.read.mockReset().mockResolvedValue({ data: null, error: null });
  server.write.mockReset().mockResolvedValue({ data: [{ id: 's1' }], error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  // Drain any waiting retry so one test's timer cannot leak into the next.
  idb.clear();
  server.read.mockResolvedValue({ data: null, error: null });
  await syncPendingScripts();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('syncPendingScripts — a script the device holds a shared document for', () => {
  it('merges the server\'s shared document in and writes the merge: both writers\' edits, not the device\'s text alone', async () => {
    queueOfflineScript();
    serverHolds(collaboratorState());

    await syncPendingScripts();

    expect(server.upsert).not.toHaveBeenCalled(); // never the plain upload
    expect(server.write).toHaveBeenCalledTimes(1);
    const patch = server.write.mock.calls[0][0];
    expect(patch.content).toContain('Still up. Alpha was offline.');
    expect(patch.content).toContain('Boats come in. Bravo stayed online.');
    expect(textOf(patch.yjs_state)).toBe(patch.content); // the stored text equals the stored state
    expect(patch).toMatchObject({ title: 'Kitchen', last_edited_by: 'user-1' });
  });

  it('writes only if nobody has written since it read (a compare-and-set on the server\'s timestamp)', async () => {
    queueOfflineScript();
    serverHolds(collaboratorState(), 'S-READ');
    await syncPendingScripts();
    expect(server.write.mock.calls[0][1]).toBe('S-READ');
  });

  it('brings the device in step: its own copy now holds the merge and is no longer waiting', async () => {
    queueOfflineScript();
    serverHolds(collaboratorState());

    await syncPendingScripts();

    const stored = idb.get('script_s1');
    expect(stored.syncPending).toBe(false);
    expect(stored.content).toContain('Bravo stayed online.');
    const persisted = idb.get(scriptTextStateKey('s1')) as PersistedScriptText;
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(persisted.state));
    expect(doc.getText(SCRIPT_TEXT_FIELD).toString()).toBe(stored.content);
    expect(getSyncStatus().pending).toBe(0);
  });

  it('reads again and merges when somebody writes between its read and its write', async () => {
    queueOfflineScript();
    server.read
      .mockResolvedValueOnce({ data: { yjs_state: collaboratorState(), updated_at: 'S1' }, error: null })
      .mockResolvedValueOnce({ data: { yjs_state: encodeScriptTextUpdate(edited('Boats come in.', ' Bravo stayed online. Charlie too.')), updated_at: 'S2' }, error: null });
    server.write
      .mockResolvedValueOnce({ data: [], error: null }) // the timestamp had moved: nothing was written
      .mockResolvedValueOnce({ data: [{ id: 's1' }], error: null });

    await syncPendingScripts();

    expect(server.read).toHaveBeenCalledTimes(2);
    expect(server.write).toHaveBeenCalledTimes(2);
    expect(server.write.mock.calls[1][1]).toBe('S2');
    expect(server.write.mock.calls[1][0].content).toContain('Charlie too.');
    expect(idb.get('script_s1').syncPending).toBe(false);
  });

  it('keeps the script waiting, and retries later, if the server keeps moving under it', async () => {
    queueOfflineScript();
    serverHolds(collaboratorState());
    server.write.mockResolvedValue({ data: [], error: null });

    await syncPendingScripts();

    expect(server.write).toHaveBeenCalledTimes(3);
    expect(idb.get('script_s1').syncPending).toBe(true);
    expect(getSyncStatus()).toMatchObject({ pending: 1, attempts: 1 });
    expect(server.upsert).not.toHaveBeenCalled();
  });

  it('does not fall back to overwriting when it cannot read the server: it waits and retries', async () => {
    queueOfflineScript();
    server.read.mockResolvedValue({ data: null, error: { message: 'timeout' } });

    await syncPendingScripts();

    expect(server.upsert).not.toHaveBeenCalled();
    expect(server.write).not.toHaveBeenCalled();
    expect(idb.get('script_s1').syncPending).toBe(true);
    expect(getSyncStatus().attempts).toBe(1);
  });

  it('keeps the script waiting when the write itself fails', async () => {
    queueOfflineScript();
    serverHolds(collaboratorState());
    server.write.mockResolvedValue({ data: null, error: { message: 'network down' } });

    await syncPendingScripts();

    expect(idb.get('script_s1').syncPending).toBe(true);
    expect(server.upsert).not.toHaveBeenCalled();
  });

  it('leaves what the writer typed since alone: no clearing the flag, no overwriting their newer shared document', async () => {
    queueOfflineScript();
    serverHolds(collaboratorState());
    const newer = offlineDoc();
    newer.getText(SCRIPT_TEXT_FIELD).insert(0, 'NEWER ');
    server.write.mockImplementationOnce(async () => {
      // While the upload was in flight, the writer went on: the device holds newer text and a newer shared document.
      idb.set('script_s1', { ...idb.get('script_s1'), content: 'NEWER text', updatedAt: 'T2' });
      idb.set(scriptTextStateKey('s1'), encodeScriptTextState(newer, BASE));
      return { data: [{ id: 's1' }], error: null };
    });

    await syncPendingScripts();

    expect(idb.get('script_s1')).toMatchObject({ content: 'NEWER text', syncPending: true });
    const persisted = idb.get(scriptTextStateKey('s1')) as PersistedScriptText;
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(persisted.state));
    expect(doc.getText(SCRIPT_TEXT_FIELD).toString()).toContain('NEWER ');
  });
});

describe('syncPendingScripts — when there is nothing to merge with, the plain upload stands', () => {
  it('uploads a script the server has not seen (created offline)', async () => {
    queueOfflineScript();
    server.read.mockResolvedValue({ data: null, error: null });
    await syncPendingScripts();
    expect(server.upsert).toHaveBeenCalledTimes(1);
    expect(server.write).not.toHaveBeenCalled();
  });

  it('uploads a script the server holds only as plain text (never written as a shared document)', async () => {
    queueOfflineScript();
    serverHolds(null);
    await syncPendingScripts();
    expect(server.upsert).toHaveBeenCalledTimes(1);
    expect(server.write).not.toHaveBeenCalled();
  });

  it('uploads a script this device holds no shared document for, without asking the server anything', async () => {
    queueOfflineScript();
    idb.delete(scriptTextStateKey('s1'));
    await syncPendingScripts();
    expect(server.read).not.toHaveBeenCalled();
    expect(server.upsert).toHaveBeenCalledTimes(1);
  });
});
