import { supabaseAdmin } from '@/lib/supabase/server';

export async function assignCrew(
  projectId: string,
  userId: string,
  role: string,
  hourlyRate?: number
) {
  try {
    const { data: existing } = await supabaseAdmin
      .from('project_crew')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'User already assigned to this project' };
    }

    const { data: crew, error } = await supabaseAdmin
      .from('project_crew')
      .insert({
        project_id: projectId,
        user_id: userId,
        role,
      })
      .select('*, profiles(*)')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, crew };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProjectCrew(projectId: string) {
  try {
    const { data: crew, error } = await supabaseAdmin
      .from('project_crew')
      .select('*, profiles(*)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, crew };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeCrew(projectId: string, crewId: string, userId: string) {
  try {
    const { data: project, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('creator_id')
      .eq('id', projectId)
      .single();

    if (fetchError || !project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabaseAdmin
      .from('project_crew')
      .delete()
      .eq('id', crewId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCrewRole(
  projectId: string,
  crewId: string,
  userId: string,
  role: string,
  hourlyRate?: number
) {
  try {
    const { data: project, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('creator_id')
      .eq('id', projectId)
      .single();

    if (fetchError || !project || project.creator_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: crew, error } = await supabaseAdmin
      .from('project_crew')
      .update({ role })
      .eq('id', crewId)
      .select('*, profiles(*)')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, crew };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
