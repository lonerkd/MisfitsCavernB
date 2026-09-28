'use client';

// The editor stash: snippets kept beside a script, shared with everyone who
// can open it and kept live (script_stash).
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';
import { useLiveRows } from '@/lib/studio/live';

export type StashItem = Tables<'script_stash'>;

export function useScriptStash(scriptId: string | null) {
  return useLiveRows<StashItem>({
    scope: scriptId,
    table: 'script_stash',
    filter: `script_id=eq.${scriptId}`,
    load: async () => {
      const { data, error } = await supabase.from('script_stash').select('*').eq('script_id', scriptId!);
      if (error) throw new Error(error.message);
      return data;
    },
    keyOf: (x) => String(x.id),
    sort: (a, b) => b.created_at.localeCompare(a.created_at),
  });
}

export async function addToStash(scriptId: string, text: string): Promise<StashItem> {
  const { data, error } = await supabase.from('script_stash').insert({ script_id: scriptId, text }).select('*').single();
  if (error) throw new Error(error.code === '23503' ? 'Save the script first, then stash from it.' : error.message);
  return data;
}

export async function removeFromStash(id: string): Promise<void> {
  const { error } = await supabase.from('script_stash').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
