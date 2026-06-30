import { supabase } from './client';

export interface DBProject {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  status: 'concept' | 'pre-production' | 'in-production' | 'post-production' | 'completed';
  accent_color?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export async function createProject(userId: string, title: string, description = '', projectType?: string) {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      title,
      description,
      creator_id: userId,
      status: 'concept',
      ...(projectType ? { project_type: projectType } : {}),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserProjects(_userId?: string) {
  // RLS ("Project members can view") already scopes this to projects the
  // current user created or is crew on, so no client-side filter is needed.
  // The previous .or(... id.in.(SELECT ...)) embedded raw SQL inside a
  // PostgREST filter, which is unsupported and returned a 400 every time.
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateProject(projectId: string, updates: Partial<DBProject>) {
  const { data, error } = await supabase
    .from('projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;
  return true;
}

export async function getProjectCrew(projectId: string) {
  const { data, error } = await supabase
    .from('project_crew')
    .select('*, profiles(*)')
    .eq('project_id', projectId);

  if (error) throw error;
  return data;
}

export async function addProjectMember(projectId: string, userId: string, role = 'team member') {
  const { data, error } = await supabase
    .from('project_crew')
    .insert({
      project_id: projectId,
      user_id: userId,
      role
    })
    .select();

  if (error) throw error;
  return data;
}

export function subscribeToProject(projectId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`project:${projectId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
      callback
    )
    .subscribe();
}
