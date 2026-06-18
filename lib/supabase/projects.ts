import { supabase } from './client';
import { logActivity } from './activity';
import { getPhaseTemplate } from '@/lib/projectTypes';
import { createNotification } from './notifications';

export interface DBProject {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  project_type: string;
  status: string;
  accent_color?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export async function createProject(userId: string, title: string, description = '', projectType = 'Feature') {
  const firstPhase = getPhaseTemplate(projectType)[0]?.id || 'concept';
  const { data, error } = await supabase
    .from('projects')
    .insert({
      title,
      description,
      creator_id: userId,
      project_type: projectType,
      status: firstPhase
    })
    .select()
    .single();

  if (error) throw error;
  await logActivity(userId, 'created_project', 'project', data.id, { project_id: data.id, title, project_type: projectType });
  return data;
}

export async function getUserProjects(userId: string) {
  // Get projects user created
  const { data: owned, error: ownedErr } = await supabase
    .from('projects')
    .select('*')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });

  if (ownedErr) throw ownedErr;

  // Get projects user is a crew member of
  const { data: crewRows, error: crewErr } = await supabase
    .from('project_crew')
    .select('project_id')
    .eq('user_id', userId);

  if (crewErr) throw crewErr;

  const crewProjectIds = (crewRows || []).map((r: any) => r.project_id);
  let crewProjects: any[] = [];

  if (crewProjectIds.length > 0) {
    const { data: cp, error: cpErr } = await supabase
      .from('projects')
      .select('*')
      .in('id', crewProjectIds)
      .order('created_at', { ascending: false });

    if (cpErr) throw cpErr;
    crewProjects = cp || [];
  }

  // Merge, deduplicate by id
  const all = [...(owned || []), ...crewProjects];
  const seen = new Set<string>();
  return all.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
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
  await logActivity(userId, 'joined_crew', 'project_crew', data?.[0]?.id, { project_id: projectId, role });

  const { data: project } = await supabase.from('projects').select('title').eq('id', projectId).maybeSingle();
  try {
    await createNotification(
      userId,
      'crew_assigned',
      `You were added to "${project?.title || 'a project'}"`,
      `Role: ${role}`,
      `/projects/${projectId}`
    );
  } catch (err) { console.error('Error creating notification:', err); }

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
