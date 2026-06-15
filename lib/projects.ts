import { supabaseAdmin } from '@/lib/supabase/server';

export async function createProject(
  creatorId: string,
  title: string,
  description?: string,
  genre?: string,
  budget?: number,
  deadline?: Date
) {
  try {
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        creator_id: creatorId,
        title,
        description,
        budget,
        start_date: deadline,
        status: 'concept',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, project };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProject(projectId: string, userId?: string) {
  try {
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('*, profiles(*), scripts(*), project_crew(*, profiles(*))')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return { success: false, error: 'Project not found' };
    }

    return { success: true, project };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserProjects(userId: string) {
  try {
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*, profiles(*)')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    genre?: string;
    budget?: number;
    deadline?: Date;
    visibility?: string;
    cover_image?: string;
    trailer_video?: string;
  }
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

    const { data: updated, error } = await supabaseAdmin
      .from('projects')
      .update(data)
      .eq('id', projectId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, project: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProject(projectId: string, userId: string) {
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
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPublicProjects(filters?: {
  genre?: string;
  status?: string;
  sortBy?: 'newest' | 'popular' | 'trending';
}) {
  try {
    let query = supabaseAdmin
      .from('projects')
      .select('*, profiles(*)')
      .limit(50);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    // Default sort by newest
    query = query.order('created_at', { ascending: false });

    const { data: projects, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, projects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
