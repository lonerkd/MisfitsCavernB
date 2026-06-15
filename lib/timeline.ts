import { supabaseAdmin } from '@/lib/supabase/server';

// The 'timeline_items' table does not exist in the deployed Supabase schema.
// Ownership checks still query the `projects` table.
// Mutation functions return graceful stubs; reads return empty lists.

export async function createTimelineItem(
  projectId: string,
  userId: string,
  phase: string,
  title: string,
  startDate: Date,
  endDate: Date,
  description?: string
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

    // Table not yet in schema — return stub
    const timeline = {
      id: crypto.randomUUID(),
      project_id: projectId,
      phase,
      title,
      description,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    };
    return { success: true, timeline };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProjectTimeline(projectId: string) {
  try {
    // Table not yet in schema — return empty list
    return { success: true, timeline: [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTimelineItem(
  timelineId: string,
  userId: string,
  projectId: string,
  data: {
    phase?: string;
    title?: string;
    description?: string;
    start_date?: Date;
    end_date?: Date;
    completion?: number;
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

    // Table not yet in schema — return stub
    const timeline = { id: timelineId, project_id: projectId, ...data };
    return { success: true, timeline };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTimelineItem(
  timelineId: string,
  userId: string,
  projectId: string
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

    // Table not yet in schema — return success stub
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
