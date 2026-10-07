// Media rows as pages outside the Studio read them (the Studio's own library
// goes through lib/studio). RLS limits each read to what the person can see.
import { supabase } from './client';

/** Media someone added, newest first, for search and pickers. */
export async function listMediaBy(userId: string, limit = 20): Promise<{ id: string; title: string | null; project_id: string | null }[]> {
  const { data, error } = await supabase.from('media').select('id, title, project_id').eq('created_by', userId)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** The newest media this person can see (titles only), for "lately" lists. */
export async function listRecentMediaTitles(limit = 6): Promise<{ title: string | null }[]> {
  const { data, error } = await supabase.from('media').select('title').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}
