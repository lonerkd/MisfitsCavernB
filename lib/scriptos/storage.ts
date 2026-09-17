
import { supabase } from '@/lib/supabase/client';
import { get, set, del, keys } from 'idb-keyval';
import { awaitOSUser, osState, SCRIPT_POINTER_PREFIX } from '@/lib/os';

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

export async function syncPendingScripts() {
  const user = await awaitOSUser();
  if (!user) return;

  // Replay offline deletes first — a delete wins over any queued upsert.
  const tombstoned = await getDeletedIds();
  for (const sid of tombstoned) {
    const { error } = await supabase.from('scripts').delete().eq('id', sid);
    if (!error) await setDeletedIds((await getDeletedIds()).filter((x) => x !== sid));
  }

  const allKeys = await keys();
  for (const k of allKeys) {
    if (typeof k === 'string' && k.startsWith('script_')) {
      const script = await get<StoredScript>(k);
      if (script && script.syncPending) {
        console.log(`[Offline Sync] Pushing pending script ${script.id}...`);

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
          script.syncPending = false;
          await set(k, script);
        } else {
          console.error(`[Offline Sync] Failed to sync ${script.id}:`, error);
        }
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Offline Sync] Back online! Syncing pending changes...');
    syncPendingScripts().catch(console.error);
  });
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

  for (const s of scripts) {
    const local = await get<StoredScript>(`script_${s.id}`);

    if (!local || !local.syncPending) {
      await set(`script_${s.id}`, s);
    }
  }

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
      unifiedData.syncPending = false;
      await set(`script_${scriptId}`, unifiedData);
    } else {
      console.warn('[Offline Sync] Supabase save failed, will sync later.', error);
    }
  }

  return unifiedData;
}

export async function deleteScript(id: string): Promise<boolean> {
  await del(`script_${id}`);
  // Record the intent so the server-side delete is replayed on next sync.
  const tombstones = await getDeletedIds();
  if (!tombstones.includes(id)) await setDeletedIds([...tombstones, id]);

  if (navigator.onLine) {
    const { error } = await supabase.from('scripts').delete().eq('id', id);
    if (!error) await setDeletedIds((await getDeletedIds()).filter((x) => x !== id));
    return !error;
  }

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
