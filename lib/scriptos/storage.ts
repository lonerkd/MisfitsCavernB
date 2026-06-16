// Supabase utilities for ScriptOS - Cloud Sync Architecture
//
// Scripts are owned via `last_edited_by` (there is NO user_id column).
// Ownership/visibility is enforced by RLS using last_edited_by + project membership.

import { supabase } from '@/lib/supabase/client';

export interface StoredScript {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user_id?: string;       // mapped from last_edited_by for app convenience
  project_id?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapRow(s: any): StoredScript {
  return {
    id: s.id,
    title: s.title,
    content: s.content ?? '',
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    user_id: s.last_edited_by,
    project_id: s.project_id,
  };
}

// Get all scripts for the current user
export async function getAllScripts(): Promise<StoredScript[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('last_edited_by', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error loading scripts:', error);
    return [];
  }

  return (data || []).map(mapRow);
}

// Get script by ID
export async function getScript(id: string): Promise<StoredScript | null> {
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapRow(data);
}

// Save script (insert when new, update when it already has a real UUID)
export async function saveScript(script: Partial<StoredScript>): Promise<StoredScript | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('saveScript: not authenticated');
    return null;
  }

  const isExisting = !!script.id && UUID_RE.test(script.id);

  if (isExisting) {
    const { data, error } = await supabase
      .from('scripts')
      .update({
        title: script.title || 'Untitled',
        content: script.content ?? '',
        last_edited_by: user.id,
        project_id: script.project_id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', script.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating script:', error);
      return null;
    }
    return mapRow(data);
  }

  const { data, error } = await supabase
    .from('scripts')
    .insert([{
      title: script.title || 'Untitled',
      content: script.content ?? '',
      last_edited_by: user.id,
      project_id: script.project_id ?? null,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating script:', error);
    return null;
  }
  return mapRow(data);
}

// Delete script
export async function deleteScript(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('scripts')
    .delete()
    .eq('id', id);

  return !error;
}

// Create new script
export async function createNewScript(title: string = 'Untitled'): Promise<StoredScript | null> {
  return saveScript({ title, content: '' });
}

// Current Script ID management (Still local for UX state)
const CURRENT_SCRIPT_KEY = 'misfits_cavern_current_script';

export function getCurrentScriptId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_SCRIPT_KEY);
}

export function setCurrentScriptId(id: string): void {
  localStorage.setItem(CURRENT_SCRIPT_KEY, id);
}

// Import script from text
export async function importScriptFromText(text: string, title: string): Promise<StoredScript | null> {
  return saveScript({ title, content: text });
}
