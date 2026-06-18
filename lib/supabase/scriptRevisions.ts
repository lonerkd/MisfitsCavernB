import { supabase } from './client';

export interface DBScriptRevision {
  id: string;
  script_id: string;
  color_index: number;
  label: string;
  snapshot: string;
  created_by?: string | null;
  created_at: string;
}

export async function getScriptRevisions(scriptId: string): Promise<DBScriptRevision[]> {
  const { data, error } = await supabase
    .from('script_revisions')
    .select('*')
    .eq('script_id', scriptId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createScriptRevision(scriptId: string, colorIndex: number, label: string, snapshot: string): Promise<DBScriptRevision> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('script_revisions')
    .insert({
      script_id: scriptId,
      color_index: colorIndex,
      label,
      snapshot,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteScriptRevision(id: string): Promise<void> {
  const { error } = await supabase.from('script_revisions').delete().eq('id', id);
  if (error) throw error;
}
