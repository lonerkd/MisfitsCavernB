
import { supabase } from '@/lib/supabase/client';
import { get, set, del, keys } from 'idb-keyval';
import { awaitOSUser, osState, SCRIPT_POINTER_PREFIX } from '@/lib/os';
import { scriptTextStateKey } from './cowriting';

export interface StoredScript {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user_id?: string;
  project_id?: string;
  syncPending?: boolean;
}

// ── Offline deletes (tombstones) ─────────────────────────────────────────────
// A local list of script ids deleted while offline, replayed against the server
// on the next sync so a delete never resurrects on reconnect — and so deleted
// content never lingers on the server.

const TOMBSTONE_KEY = 'mc_deleted_scripts';

async function getDeletedIds(): Promise<string[]> {
  try { return (await get<string[]>(TOMBSTONE_KEY)) || []; } catch { return []; }
}

async function setDeletedIds(ids: string[]): Promise<void> {
  try { await set(TOMBSTONE_KEY, ids); } catch { /* storage unavailable */ }
}

// ── Offline Queue / Sync Manager ─────────────────────────────────────────────

/** What the editor footer shows about the offline queue. */
export interface SyncStatus {
  /** Scripts saved on this device and not yet on the server. */
  pending: number;
  /** Deletes made offline and not yet replayed on the server. */
  deletes: number;
  /** A sync pass is running now. */
  syncing: boolean;
  /** Epoch ms of the next automatic retry; null when none is waiting. */
  nextRetryAt: number | null;
  /** Failed passes in a row; 0 after a clean one. */
  attempts: number;
  /** The browser's own idea of connectivity. */
  online: boolean;
}

const RETRY_BASE_MS = 15000;
const RETRY_MAX_MS = 5 * 60 * 1000;

/** 15 s, 30 s, 60 s … capped at 5 min, for the nth failed pass in a row. */
export function retryDelayMs(attempts: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), RETRY_MAX_MS);
}

let status: SyncStatus = {
  pending: 0, deletes: 0, syncing: false, nextRetryAt: null, attempts: 0,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
};
const listeners = new Set<() => void>();

function patchStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function getSyncStatus(): SyncStatus { return status; }

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Recount the queue from the device store. */
export async function refreshSyncStatus(): Promise<void> {
  try {
    let pending = 0;
    for (const k of await keys()) {
      if (typeof k === 'string' && k.startsWith('script_')) {
        const script = await get<StoredScript>(k);
        if (script?.syncPending) pending++;
      }
    }
    patchStatus({ pending, deletes: (await getDeletedIds()).length });
  } catch { /* storage unavailable — keep the last known counts */ }
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;

export async function syncPendingScripts() {
  const user = await awaitOSUser();
  if (!user) return;

  // A pass that starts now supersedes any waiting retry.
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  patchStatus({ syncing: true, nextRetryAt: null });
  let failed = false;

  try {
    // Replay offline deletes first — a delete wins over any queued upsert.
    // The tombstone holds an id only (no content); the server's RLS decides
    // whether this person may delete the row, so a replay can't touch others'.
    const tombstoned = await getDeletedIds();
    for (const sid of tombstoned) {
      const { error } = await supabase.from('scripts').delete().eq('id', sid);
      if (!error) await setDeletedIds((await getDeletedIds()).filter((x) => x !== sid));
      else failed = true;
    }

    const allKeys = await keys();
    for (const k of allKeys) {
      if (typeof k === 'string' && k.startsWith('script_')) {
        const script = await get<StoredScript>(k);
        if (script && script.syncPending) {
          const baseData = {
            id: script.id,
            title: script.title,
            content: script.content,
            last_edited_by: user.id,
            updated_at: script.updatedAt,
            project_id: script.project_id
          };

          const { error } = await supabase.from('scripts').upsert([{
            ...baseData,
            created_by: script.user_id || user.id,
            status: 'draft'
          }]);

          if (!error) {
            // Only clear the flag if the writer hasn't saved newer text while this
            // upload was in flight — otherwise we'd overwrite it with this snapshot.
            const latest = await get<StoredScript>(k);
            if (latest && latest.updatedAt === script.updatedAt) {
              await set(k, { ...latest, syncPending: false });
            }
          } else {
            failed = true;
            console.error(`[Offline Sync] Failed to sync ${script.id}:`, error);
          }
        }
      }
    }
  } catch (e) {
    failed = true;
    console.error('[Offline Sync] Pass failed:', e);
  } finally {
    patchStatus({ syncing: false, attempts: failed ? status.attempts + 1 : 0 });
    await refreshSyncStatus();
    if (failed) scheduleScriptSync(retryDelayMs(status.attempts));
  }
}

// Retry unsynced edits shortly after a failed save. The 'online' event alone
// misses the common case: a request that failed while the browser still
// considered itself online (a blip, a dropped connection), which never fires it.
export function scheduleScriptSync(delayMs = RETRY_BASE_MS) {
  if (typeof window === 'undefined' || retryTimer) return;
  patchStatus({ nextRetryAt: Date.now() + delayMs });
  retryTimer = setTimeout(() => {
    retryTimer = null;
    syncPendingScripts().catch(console.error);
  }, delayMs);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    patchStatus({ online: true });
    // Back online: syncPendingScripts cancels a waiting retry and runs now.
    syncPendingScripts().catch(console.error);
  });
  window.addEventListener('offline', () => patchStatus({ online: false }));
}

// ── Storage APIs ─────────────────────────────────────────────────────────────

export async function getAllScripts(projectId?: string): Promise<StoredScript[]> {
  const user = await awaitOSUser();
  if (!user) return [];
  const deleted = new Set(await getDeletedIds());

  let query = supabase
    .from('scripts')
    .select('*')
    .eq('created_by', user.id)
    .order('updated_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.warn('[Offline Sync] Failed to fetch scripts from Supabase. Falling back to local cache.');

    const allKeys = await keys();
    const localScripts: StoredScript[] = [];
    for (const k of allKeys) {
      if (typeof k === 'string' && k.startsWith('script_')) {
        const script = await get<StoredScript>(k);
        if (script && !deleted.has(script.id) && script.user_id === user.id && (!projectId || script.project_id === projectId)) {
          localScripts.push(script);
        }
      }
    }
    return localScripts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  const scripts: StoredScript[] = data
    .filter((s: any) => !deleted.has(s.id))
    .map((s: any) => ({
    id: s.id,
    title: s.title,
    content: s.content ?? '',
    createdAt: s.created_at ?? '',
    updatedAt: s.updated_at ?? '',
    user_id: s.created_by ?? undefined,
    project_id: s.project_id ?? undefined,
    syncPending: false
  }));

  for (let i = 0; i < scripts.length; i++) {
    const s = scripts[i];
    const local = await get<StoredScript>(`script_${s.id}`);

    if (local?.syncPending) {
      // Unsynced local edits are newer than the server copy: show them, never
      // the stale server text (which the next autosave would then write back
      // over the writer's work).
      scripts[i] = local;
    } else {
      await set(`script_${s.id}`, s);
    }
  }
  if (scripts.some((s) => s.syncPending)) scheduleScriptSync(0);

  const allKeys = await keys();
  for (const k of allKeys) {
    if (typeof k === 'string' && k.startsWith('script_')) {
      const script = await get<StoredScript>(k);
      if (script && script.syncPending && !scripts.find(x => x.id === script.id)) {
        if (script.user_id === user.id && (!projectId || script.project_id === projectId)) {
          scripts.push(script);
        }
      }
    }
  }

  return scripts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getScript(id: string): Promise<StoredScript | null> {

  const local = await get<StoredScript>(`script_${id}`);

  if (!navigator.onLine) {
    return local || null;
  }

  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return local || null;
  }

  const remote: StoredScript = {
    id: data.id,
    title: data.title,
    content: data.content ?? '',
    createdAt: data.created_at ?? '',
    updatedAt: data.updated_at ?? '',
    user_id: data.created_by ?? undefined,
    project_id: data.project_id ?? undefined,
    syncPending: false
  };

  if (!local || !local.syncPending) {
    await set(`script_${id}`, remote);
  }

  return local?.syncPending ? local : remote;
}

export async function saveScript(script: Partial<StoredScript>): Promise<StoredScript | null> {
  const user = await awaitOSUser();
  if (!user) return null;

  const isNew = !script.id;
  const scriptId = script.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const unifiedData: StoredScript = {
    id: scriptId,
    title: script.title || 'Untitled',
    content: script.content || '',
    createdAt: script.createdAt || now,
    updatedAt: now,
    user_id: script.user_id || user.id,
    project_id: script.project_id,
    syncPending: true
  };

  await set(`script_${scriptId}`, unifiedData);

  if (navigator.onLine) {
    const baseData = {
      id: unifiedData.id,
      title: unifiedData.title,
      content: unifiedData.content,
      last_edited_by: user.id,
      updated_at: unifiedData.updatedAt,
      project_id: unifiedData.project_id
    };

    let error;
    if (isNew) {
      const res = await supabase.from('scripts').insert([{ ...baseData, created_by: user.id, status: 'draft' }]).select().single();
      error = res.error;
    } else {
      const res = await supabase.from('scripts').update(baseData).eq('id', scriptId).select().single();
      error = res.error;
    }

    if (!error) {
      const latest = await get<StoredScript>(`script_${scriptId}`);
      if (!latest || latest.updatedAt === unifiedData.updatedAt) {
        unifiedData.syncPending = false;
        await set(`script_${scriptId}`, unifiedData);
      }
    } else {
      console.warn('[Offline Sync] Supabase save failed, will sync later.', error);
      scheduleScriptSync();
    }
  }

  await refreshSyncStatus();
  return unifiedData;
}

export async function deleteScript(id: string): Promise<boolean> {
  await del(`script_${id}`);
  await del(scriptTextStateKey(id));
  // Record the intent so the server-side delete is replayed on next sync.
  const tombstones = await getDeletedIds();
  if (!tombstones.includes(id)) await setDeletedIds([...tombstones, id]);

  if (navigator.onLine) {
    const { error } = await supabase.from('scripts').delete().eq('id', id);
    if (!error) await setDeletedIds((await getDeletedIds()).filter((x) => x !== id));
    await refreshSyncStatus();
    return !error;
  }

  await refreshSyncStatus();
  return true;
}

export async function createNewScript(title: string = 'Untitled', projectId?: string): Promise<StoredScript | null> {
  return saveScript({ title, content: '', project_id: projectId });
}

function scriptPointerKey(): string {
  const projectId = osState().project.active?.id || 'personal';
  return `${SCRIPT_POINTER_PREFIX}${projectId}`;
}

export function getCurrentScriptId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(scriptPointerKey());
}

export function setCurrentScriptId(id: string): void {
  localStorage.setItem(scriptPointerKey(), id);
}

export async function importScriptFromText(text: string, title: string, projectId?: string): Promise<StoredScript | null> {
  return saveScript({
    title,
    content: text,
    project_id: projectId
  });
}
