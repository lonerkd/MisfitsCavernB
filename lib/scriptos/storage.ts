// Supabase utilities for ScriptOS - Cloud Sync Architecture

import { supabase } from '@/lib/supabase/client';

export interface StoredScript {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user_id?: string;
  project_id?: string;
}

// Get all scripts for the current user
export async function getAllScripts(): Promise<StoredScript[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error loading scripts:', error);
    return [];
  }

  return (data || []).map(s => ({
    id: s.id,
    title: s.title,
    content: s.content,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    user_id: s.user_id,
    project_id: s.project_id
  }));
}

// Get script by ID
export async function getScript(id: string): Promise<StoredScript | null> {
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    content: data.content,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    user_id: data.user_id,
    project_id: data.project_id
  };
}

// Save script (UPSERT)
export async function saveScript(script: Partial<StoredScript>): Promise<StoredScript | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const scriptData = {
    title: script.title || 'Untitled',
    content: script.content || '',
    user_id: user.id,
    updated_at: new Date().toISOString(),
    project_id: script.project_id
  };

  if (script.id && !script.id.includes('-')) { // Not a temporary ID
    const { data, error } = await supabase
      .from('scripts')
      .update(scriptData)
      .eq('id', script.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating script:', error);
      return null;
    }
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } else {
    const { data, error } = await supabase
      .from('scripts')
      .insert([scriptData])
      .select()
      .single();

    if (error) {
      console.error('Error creating script:', error);
      return null;
    }
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
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
  return saveScript({
    title,
    content: text
  });
}
