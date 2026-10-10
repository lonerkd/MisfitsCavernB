'use client';

import { useCallback, useEffect, useState } from 'react';
import { addScriptCharacter, listScriptCharacters, updateScriptCharacter } from '@/lib/supabase/scripts';
import { parseScript } from '@/lib/scriptos/parser';
import { fetchScriptContent } from '@/lib/studio';
import type { Tables } from '@/lib/supabase/database.types';

export const CHARACTER_PALETTE = ['#e8431a', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0099ff', '#a855f7'];

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
const NO_CHARS: ScriptCharacter[] = [];

export function useScriptCharacters(scriptId: string | null, userId: string) {
  const [loadedChars, setChars] = useState<ScriptCharacter[]>([]);
  // How the last load for a script went; a script without one is loading.
  const [loaded, setLoaded] = useState<{ scriptId: string; ok: boolean } | null>(null);
  const status: 'loading' | 'ready' | 'error' = !scriptId ? 'ready' : loaded?.scriptId !== scriptId ? 'loading' : loaded.ok ? 'ready' : 'error';
  const chars = scriptId ? loadedChars : NO_CHARS;

  const load = useCallback(() => {
    if (!scriptId) return Promise.resolve();
    return Promise.all([
      fetchScriptContent(scriptId),
      listScriptCharacters(scriptId),
    ]).then(([text, saved]) => {
      const byName = new Map(saved.map((r) => [r.name, r]));
      const parsed = parseScript(text).characters.map((c) => c.name).filter(Boolean);
      const names = Array.from(new Set([...parsed, ...saved.map((r) => r.name)]));
      setChars(names.map((name, i) => {
        const row = byName.get(name) ?? null;
        return { name, row, color: row?.color || CHARACTER_PALETTE[i % CHARACTER_PALETTE.length] };
      }));
      setLoaded({ scriptId, ok: true });
    }).catch(() => setLoaded({ scriptId, ok: false }));
  }, [scriptId]);

  useEffect(() => { void load(); }, [load]);

  /** The saved row for a character, created on first use. */
  const ensureRow = useCallback(async (c: ScriptCharacter): Promise<SavedCharacter> => {
    if (c.row) return c.row;
    if (!scriptId) throw new Error('No script selected');
    const data = await addScriptCharacter({ scriptId, name: c.name, color: c.color, userId });
    setChars((prev) => prev.map((x) => (x.name === c.name ? { ...x, row: data } : x)));
    return data;
  }, [scriptId, userId]);

  const save = useCallback(async (c: ScriptCharacter, patch: Pick<SavedCharacter, 'full_name' | 'age' | 'arc' | 'description'>) => {
    const row = await ensureRow(c);
    const data = await updateScriptCharacter(row.id, userId, patch);
    setChars((prev) => prev.map((x) => (x.name === c.name ? { ...x, row: data } : x)));
  }, [ensureRow, userId]);

  return { chars, status, reload: load, ensureRow, save };
}
