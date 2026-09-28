import { supabase } from './client';
import type { TablesInsert, TablesUpdate } from './database.types';

// Story beats. (The media library, scenes and links live in lib/studio.)

export async function getProjectBeats(projectId: string) {
  const { data, error } = await supabase.from('project_beats').select('*').eq('project_id', projectId).order('order_index', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createProjectBeat(beat: TablesInsert<'project_beats'>) {
  const { data, error } = await supabase.from('project_beats').insert(beat).select().single();
  if (error) throw error;
  return data;
}

export async function updateProjectBeat(beatId: string, updates: TablesUpdate<'project_beats'>) {
  const { data, error } = await supabase.from('project_beats').update(updates).eq('id', beatId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProjectBeat(beatId: string) {
  const { error } = await supabase.from('project_beats').delete().eq('id', beatId);
  if (error) throw error;
  return true;
}
