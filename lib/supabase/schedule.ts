import { supabase } from './client';

export interface ShootDay {
  id: string;
  project_id: string;
  day_number: number;
  shoot_date: string | null;
  created_at: string;
}

export interface SceneSchedule {
  id: string;
  project_id: string;
  script_id: string | null;
  scene_number: string;
  scene_heading: string;
  shoot_day_id: string | null;
  location: string;
  estimated_hours: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export async function getShootDays(projectId: string): Promise<ShootDay[]> {
  const { data, error } = await supabase
    .from('shoot_days')
    .select('*')
    .eq('project_id', projectId)
    .order('day_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addShootDay(projectId: string): Promise<ShootDay> {
  const days = await getShootDays(projectId);
  const nextNumber = days.length ? Math.max(...days.map(d => d.day_number)) + 1 : 1;
  const { data, error } = await supabase
    .from('shoot_days')
    .insert({ project_id: projectId, day_number: nextNumber })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteShootDay(id: string): Promise<void> {
  const { error } = await supabase.from('shoot_days').delete().eq('id', id);
  if (error) throw error;
}

export async function getSceneSchedule(projectId: string): Promise<SceneSchedule[]> {
  const { data, error } = await supabase
    .from('scene_schedule')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Scenes parsed from the script that don't have a schedule row yet get one
// created — the schedule is then the real, queryable shoot list, kept in
// step with whatever the screenplay's scene structure actually is.
export async function ensureSceneSchedule(
  projectId: string,
  scriptId: string,
  scenes: { sceneNumber: string; heading: string }[]
): Promise<SceneSchedule[]> {
  const existing = await getSceneSchedule(projectId);
  const existingNumbers = new Set(existing.map(s => s.scene_number));
  const missing = scenes.filter(s => !existingNumbers.has(s.sceneNumber));
  if (missing.length === 0) return existing;

  const inserts = missing.map((s, i) => ({
    project_id: projectId,
    script_id: scriptId,
    scene_number: s.sceneNumber,
    scene_heading: s.heading,
    order_index: existing.length + i,
  }));

  const { data, error } = await supabase
    .from('scene_schedule')
    .insert(inserts)
    .select();
  if (error) throw error;
  return [...existing, ...(data || [])];
}

export async function updateSceneSchedule(id: string, updates: Partial<Pick<SceneSchedule, 'shoot_day_id' | 'location' | 'estimated_hours'>>): Promise<SceneSchedule> {
  const { data, error } = await supabase
    .from('scene_schedule')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToSchedule(projectId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`schedule:${projectId}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shoot_days', filter: `project_id=eq.${projectId}` }, callback)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scene_schedule', filter: `project_id=eq.${projectId}` }, callback)
    .subscribe();
}
