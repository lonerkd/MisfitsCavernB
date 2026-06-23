// Supabase utilities for ScriptOS - Cloud Sync Architecture

import { supabase } from '@/lib/supabase/client';

export interface StoredScript {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    project_id?: string;
    learned_rules?: any;
}

// Get all scripts for the current user (by created_by)
export async function getAllScripts(): Promise<StoredScript[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

  const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .eq('created_by', user.id)
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
        project_id: s.project_id,
        learned_rules: getLearnedRulesLocal(s.id),
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
        project_id: data.project_id,
        learned_rules: getLearnedRulesLocal(data.id),
  };
}

// Save script (UPSERT) - no user_id or learned_rules in DB
export async function saveScript(script: Partial<StoredScript>): Promise<StoredScript | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

  // Save learned_rules to localStorage only
  if (script.id && script.learned_rules) {
        saveLearnedRulesLocal(script.id, script.learned_rules);
  }

  const scriptData: Record<string, any> = {
        title: script.title || 'Untitled',
        content: script.content || '',
        updated_at: new Date().toISOString(),
  };
    if (script.project_id) scriptData.project_id = script.project_id;

  if (script.id && script.id.length === 36 && script.id.includes('-')) {
        // Real UUID - update existing
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
                updatedAt: data.updated_at,
                learned_rules: getLearnedRulesLocal(data.id),
        };
  } else {
        // New script - insert with created_by
      const insertData = { ...scriptData, created_by: user.id, status: 'draft', format: 'screenplay' };
        const { data, error } = await supabase
          .from('scripts')
          .insert([insertData])
          .select()
          .single();

      if (error) {
              console.error('Error creating script:', error);
              return null;
      }
        if (script.learned_rules) saveLearnedRulesLocal(data.id, script.learned_rules);
        return {
                id: data.id,
                title: data.title,
                content: data.content,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                learned_rules: getLearnedRulesLocal(data.id),
        };
  }
}

// Delete script
export async function deleteScript(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('scripts')
      .delete()
      .eq('id', id);

  if (!error) localStorage.removeItem(`mc_lr_${id}`);
    return !error;
}

// Create new script
export async function createNewScript(title: string = 'Untitled'): Promise<StoredScript | null> {
    return saveScript({ title, content: '' });
}

// Current Script ID management (local for UX state)
const CURRENT_SCRIPT_KEY = 'misfits_cavern_current_script';

export function getCurrentScriptId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(CURRENT_SCRIPT_KEY);
}

export function setCurrentScriptId(id: string): void {
    localStorage.setItem(CURRENT_SCRIPT_KEY, id);
}

// Learned rules stored locally per script
function getLearnedRulesLocal(scriptId: string): any {
    if (typeof window === 'undefined') return null;
    try {
          const raw = localStorage.getItem(`mc_lr_${scriptId}`);
          return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function saveLearnedRulesLocal(scriptId: string, rules: any): void {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(`mc_lr_${scriptId}`, JSON.stringify(rules)); } catch { }
}

// Import script from text
export async function importScriptFromText(text: string, title: string): Promise<StoredScript | null> {
    return saveScript({ title, content: text });
}
