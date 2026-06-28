// Supabase utilities for ScriptOS - Cloud Sync Architecture
// scripts table columns: id, project_id, title, content, format, version,
//   last_edited_by, status, created_at, updated_at, title_page, stash_items,
//   daily_goal, sprint_minutes, learned_rules, created_by, share_token, shared

import { supabase } from '@/lib/supabase/client';

export interface StoredScript {
      id: string;
      title: string;
      content: string;
      createdAt: string;
      updatedAt: string;
      project_id?: string;
      learned_rules?: any;
      shareToken?: string;
      shared?: boolean;
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
          learned_rules: s.learned_rules,
          shareToken: s.share_token,
          shared: s.shared,
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
          learned_rules: data.learned_rules,
          shareToken: data.share_token,
          shared: data.shared,
  };
}

// Save script (INSERT or UPDATE). Pass { snapshot: true } on explicit user-initiated
// saves (e.g. Ctrl+S) to checkpoint the prior content into script_versions — the silent
// 2s auto-save loop deliberately skips this so version history doesn't fill up with noise.
export async function saveScript(script: Partial<StoredScript>, options?: { snapshot?: boolean }): Promise<StoredScript | null> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

  if (script.id && script.id.length === 36 && script.id.includes('-')) {
          // Real UUID - update existing script
        const updateData: Record<string, any> = {
                  title: script.title || 'Untitled',
                  content: script.content || '',
                  last_edited_by: user.id,
                  updated_at: new Date().toISOString(),
        };
          if (script.project_id !== undefined) updateData.project_id = script.project_id;
          if (script.learned_rules !== undefined) updateData.learned_rules = script.learned_rules;

          if (options?.snapshot) {
            const { data: existing } = await supabase
              .from('scripts')
              .select('content, version')
              .eq('id', script.id)
              .single();
            if (existing && existing.content !== updateData.content) {
              updateData.version = (existing.version || 1) + 1;
              const { error: snapshotError } = await supabase.from('script_versions').insert({
                script_id: script.id,
                content: existing.content,
                version: existing.version || 1,
                edited_by: user.id,
              });
              if (snapshotError) console.error('Error snapshotting script version:', snapshotError);
            }
          }

        const { data, error } = await supabase
            .from('scripts')
            .update(updateData)
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
                    project_id: data.project_id,
                    learned_rules: data.learned_rules,
                    shareToken: data.share_token,
                    shared: data.shared,
          };
  } else {
          // New script - insert
        const insertData: Record<string, any> = {
                  title: script.title || 'Untitled',
                  content: script.content || '',
                  created_by: user.id,
                  last_edited_by: user.id,
                  status: 'draft',
                  format: 'screenplay',
                  updated_at: new Date().toISOString(),
        };
          if (script.project_id) insertData.project_id = script.project_id;
          if (script.learned_rules) insertData.learned_rules = script.learned_rules;

        const { data, error } = await supabase
            .from('scripts')
            .insert([insertData])
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
                    updatedAt: data.updated_at,
                    project_id: data.project_id,
                    learned_rules: data.learned_rules,
                    shareToken: data.share_token,
                    shared: data.shared,
          };
  }
}

// Toggle public sharing for a script. Returns the new shared state and share URL token.
export async function setScriptShared(id: string, shared: boolean): Promise<{ shared: boolean; shareToken: string } | null> {
  const { data, error } = await supabase
    .from('scripts')
    .update({ shared })
    .eq('id', id)
    .select('shared, share_token')
    .single();

  if (error || !data) {
    console.error('Error updating script share state:', error);
    return null;
  }
  return { shared: data.shared, shareToken: data.share_token };
}

export interface ScriptVersion {
  id: string;
  script_id: string;
  content: string;
  version: number;
  edited_by: string;
  created_at: string;
}

// Get version history for a script (newest first)
export async function getScriptVersions(scriptId: string): Promise<ScriptVersion[]> {
  const { data, error } = await supabase
    .from('script_versions')
    .select('*')
    .eq('script_id', scriptId)
    .order('version', { ascending: false });

  if (error) {
    console.error('Error loading script versions:', error);
    return [];
  }
  return data || [];
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

// Current Script ID management (local for UX state)
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
