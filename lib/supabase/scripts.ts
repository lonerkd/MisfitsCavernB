// Script rows and their character bible, as pages read them. (The editor's own
// load/save path, with its offline outbox, is lib/scriptos/storage.ts and
// sync.ts — this is for everything around it.)
import { supabase } from './client';
import type { Tables, TablesUpdate } from './database.types';

export type ScriptCharacterRow = Tables<'script_characters'>;

/** The project's most recently edited script's id; null when it has none. Throws when the lookup fails. */
export async function latestScriptId(projectId: string): Promise<string | null> {
  const { data, error } = await supabase.from('scripts').select('id').eq('project_id', projectId)
    .order('updated_at', { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0]?.id ?? null;
}

/** Starts a project's script (empty, a draft); returns its id and title. */
export async function createProjectScript(p: { projectId: string; title: string; format: string; userId: string | null }): Promise<{ id: string; title: string }> {
  const { data, error } = await supabase.from('scripts')
    .insert({ project_id: p.projectId, title: p.title, content: '', format: p.format, status: 'draft', created_by: p.userId, last_edited_by: p.userId })
    .select('id,title').single();
  if (error) throw error;
  return data;
}

/** A script's title and project, for places that only need to name it. */
export async function getScriptMeta(id: string): Promise<{ title: string | null; project_id: string | null } | null> {
  const { data, error } = await supabase.from('scripts').select('title, project_id').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Scripts someone started (up to `limit`), for search and pickers. */
export async function listScriptsBy(userId: string, limit = 20): Promise<{ id: string; title: string; project_id: string | null }[]> {
  const { data, error } = await supabase.from('scripts').select('id, title, project_id').eq('created_by', userId).limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ── The character bible ─────────────────────────────────────────────────────

export async function listScriptCharacters(scriptId: string): Promise<ScriptCharacterRow[]> {
  const { data, error } = await supabase.from('script_characters').select('*').eq('script_id', scriptId);
  if (error) throw error;
  return data ?? [];
}

export async function addScriptCharacter(c: { scriptId: string; name: string; color: string; userId: string }): Promise<ScriptCharacterRow> {
  const { data, error } = await supabase.from('script_characters')
    .insert({ script_id: c.scriptId, name: c.name, color: c.color, updated_by: c.userId })
    .select('*').single();
  if (error) throw error;
  return data;
}

export async function updateScriptCharacter(id: string, userId: string, patch: TablesUpdate<'script_characters'>): Promise<ScriptCharacterRow> {
  const { data, error } = await supabase.from('script_characters')
    .update({ ...patch, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
