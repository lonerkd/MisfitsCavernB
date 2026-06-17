import { supabase } from './client';
import { logActivity } from './activity';

export interface DBBeat {
  id: string;
  project_id: string;
  script_id: string | null;
  scene_number: string | null;
  title: string;
  content: string;
  color: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

const BEAT_COLORS = ['#0099ff', '#ffaa00', '#ff3c00', '#a855f7', '#00cc66', '#ec4899'];

export async function getProjectBeats(projectId: string): Promise<DBBeat[]> {
  const { data, error } = await supabase
    .from('project_beats')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createBeat(projectId: string, beat: { title: string; content?: string; scriptId?: string | null; sceneNumber?: string | null }): Promise<DBBeat> {
  const { count } = await supabase
    .from('project_beats')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('project_beats')
    .insert({
      project_id: projectId,
      script_id: beat.scriptId ?? null,
      scene_number: beat.sceneNumber ?? null,
      title: beat.title,
      content: beat.content ?? '',
      color: BEAT_COLORS[(count || 0) % BEAT_COLORS.length],
      order_index: count || 0,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  if (user) await logActivity(user.id, 'added_beat', 'project', projectId, { title: beat.title });
  return data;
}

export async function updateBeat(id: string, updates: Partial<Pick<DBBeat, 'title' | 'content' | 'scene_number' | 'script_id'>>): Promise<DBBeat> {
  const { data, error } = await supabase
    .from('project_beats')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBeat(id: string): Promise<void> {
  const { error } = await supabase.from('project_beats').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToProjectBeats(projectId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`project_beats:${projectId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'project_beats', filter: `project_id=eq.${projectId}` }, callback)
    .subscribe();
}
