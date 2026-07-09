// Supabase utilities for ScriptOS - Cloud Sync Architecture
import { supabase } from '@/lib/supabase/client';
import { get, set, del, keys } from 'idb-keyval';

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

// ── Offline Queue / Sync Manager ─────────────────────────────────────────────
// When offline, we write to IndexedDB and mark as syncPending. When online,
// we push the pending scripts up to Supabase.
export async function syncPendingScripts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

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

        // We UPSERT the pending data to Supabase
        const { error } = await supabase.from('scripts').upsert([{
          ...baseData,
          created_by: script.user_id || user.id, // Fallback if missing
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

// Automatically sync when returning online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Offline Sync] Back online! Syncing pending changes...');
    syncPendingScripts().catch(console.error);
  });
}

// ── Storage APIs ─────────────────────────────────────────────────────────────

export async function getAllScripts(projectId?: string): Promise<StoredScript[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
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
    // Fallback to local cache
    const allKeys = await keys();
    const localScripts: StoredScript[] = [];
    for (const k of allKeys) {
      if (typeof k === 'string' && k.startsWith('script_')) {
        const script = await get<StoredScript>(k);
        if (script && script.user_id === user.id && (!projectId || script.project_id === projectId)) {
          localScripts.push(script);
        }
      }
    }
    return localScripts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  // Update local cache with remote truth
  const scripts: StoredScript[] = data.map(s => ({
    id: s.id,
    title: s.title,
    content: s.content,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    user_id: s.created_by,
    project_id: s.project_id,
    syncPending: false
  }));

  for (const s of scripts) {
    const local = await get<StoredScript>(`script_${s.id}`);
    // Only overwrite local cache if local doesn't have pending changes
    if (!local || !local.syncPending) {
      await set(`script_${s.id}`, s);
    }
  }

  // Fetch pending scripts that aren't on remote yet (created offline)
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
  // Try local first for speed
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

  const remote = {
    id: data.id,
    title: data.title,
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    user_id: data.created_by,
    project_id: data.project_id,
    syncPending: false
  };

  if (!local || !local.syncPending) {
    await set(`script_${id}`, remote);
  }

  return local?.syncPending ? local : remote;
}

export async function saveScript(script: Partial<StoredScript>): Promise<StoredScript | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Build the unified object
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

  // Instantly save to local IndexedDB
  await set(`script_${scriptId}`, unifiedData);

  // Attempt network sync
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
      await set(`script_${scriptId}`, unifiedData); // update pending flag
    } else {
      console.warn('[Offline Sync] Supabase save failed, will sync later.', error);
    }
  }

  return unifiedData;
}

export async function deleteScript(id: string): Promise<boolean> {
  await del(`script_${id}`); // Delete local
  if (navigator.onLine) {
    const { error } = await supabase.from('scripts').delete().eq('id', id);
    return !error;
  }
  // If offline, we could mark it as deleted in a tombstone list, but for now just drop local.
  return true;
}

export async function createNewScript(title: string = 'Untitled', projectId?: string): Promise<StoredScript | null> {
  return saveScript({ title, content: '', project_id: projectId });
}

const CURRENT_SCRIPT_KEY = 'misfits_cavern_current_script';

export function getCurrentScriptId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_SCRIPT_KEY);
}

export function setCurrentScriptId(id: string): void {
  localStorage.setItem(CURRENT_SCRIPT_KEY, id);
}

export async function importScriptFromText(text: string, title: string, projectId?: string): Promise<StoredScript | null> {
  return saveScript({
    title,
    content: text,
    project_id: projectId
  });
}
