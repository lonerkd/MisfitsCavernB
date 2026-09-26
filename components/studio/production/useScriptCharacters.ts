'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { parseScript } from '@/lib/scriptos/parser';
import { fetchScriptContent } from '@/lib/studio';
import type { Tables } from '@/lib/supabase/database.types';

export const CHARACTER_PALETTE = ['#d7340b', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0099ff', '#a855f7'];

export type SavedCharacter = Tables<'script_characters'>;
export interface ScriptCharacter {
  name: string;
  color: string;
  /** The saved bible row, once one exists. */
  row: SavedCharacter | null;
}

/**
 * The characters of one script: everyone who speaks in it (parsed) plus anyone
 * with a saved bible entry, merged by name.
 */
export function useScriptCharacters(scriptId: string | null, userId: string) {
  const [chars, setChars] = useState<ScriptCharacter[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    if (!scriptId) { setChars([]); setStatus('ready'); return; }
    try {
      const [text, saved] = await Promise.all([
        fetchScriptContent(scriptId),
        supabase.from('script_characters').select('*').eq('script_id', scriptId),
      ]);
      if (saved.error) throw saved.error;
      const byName = new Map(saved.data.map((r) => [r.name, r]));
      const parsed = parseScript(text).characters.map((c) => c.name).filter(Boolean);
      const names = Array.from(new Set([...parsed, ...saved.data.map((r) => r.name)]));
      setChars(names.map((name, i) => {
        const row = byName.get(name) ?? null;
        return { name, row, color: row?.color || CHARACTER_PALETTE[i % CHARACTER_PALETTE.length] };
      }));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [scriptId]);

  useEffect(() => { setStatus('loading'); void load(); }, [load]);

  /** The saved row for a character, created on first use. */
  const ensureRow = useCallback(async (c: ScriptCharacter): Promise<SavedCharacter> => {
    if (c.row) return c.row;
    if (!scriptId) throw new Error('No script selected');
    const { data, error } = await supabase
      .from('script_characters')
      .insert({ script_id: scriptId, name: c.name, color: c.color, updated_by: userId })
      .select('*')
      .single();
    if (error) throw error;
    setChars((prev) => prev.map((x) => (x.name === c.name ? { ...x, row: data } : x)));
    return data;
  }, [scriptId, userId]);

  const save = useCallback(async (c: ScriptCharacter, patch: Pick<SavedCharacter, 'full_name' | 'age' | 'arc' | 'description'>) => {
    const row = await ensureRow(c);
    const { data, error } = await supabase
      .from('script_characters')
      .update({ ...patch, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .select('*')
      .single();
    if (error) throw error;
    setChars((prev) => prev.map((x) => (x.name === c.name ? { ...x, row: data } : x)));
  }, [ensureRow, userId]);

  return { chars, status, reload: load, ensureRow, save };
}
