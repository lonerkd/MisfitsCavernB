import { supabase } from './client';
import { logAuditAction } from './audit';

export type CrewRole = 'owner' | 'lead' | 'contributor' | 'viewer';

export interface CrewMember {
  id: string;
  project_id: string;
  user_id: string;
  role: CrewRole;
  joined_at: string;
  username?: string;
  avatar_url?: string;
}

/**
 * Assign a crew member to a project with a specific role
 */
export async function assignCrewMember(
  projectId: string,
  userId: string,
  role: CrewRole,
  currentUserId: string,
) {
  try {
    const { data, error } = await supabase
      .from('project_crew')
      .upsert(
        {
          project_id: projectId,
          user_id: userId,
          role: role,
        },
        { onConflict: 'project_id,user_id' },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the action
    await logAuditAction(
      currentUserId,
      'crew_role_changed',
      'project_crew',
      `${projectId}:${userId}`,
      { role, action: 'assigned' },
    );

    return data;
  } catch (error) {
    console.error('Failed to assign crew member:', error);
    throw error;
  }
}

/**
 * Remove a crew member from a project
 */
export async function removeCrewMember(
  projectId: string,
  userId: string,
  currentUserId: string,
) {
  try {
    const { error } = await supabase
      .from('project_crew')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // Log the action
    await logAuditAction(
      currentUserId,
      'crew_removed',
      'project_crew',
      `${projectId}:${userId}`,
      { action: 'removed' },
    );
  } catch (error) {
    console.error('Failed to remove crew member:', error);
    throw error;
  }
}

/**
 * Get crew members for a project
 */
export async function getProjectCrew(projectId: string): Promise<CrewMember[]> {
  try {
    const { data, error } = await supabase
      .from('project_crew')
      .select(`
        id,
        project_id,
        user_id,
        role,
        joined_at,
        profiles:user_id(username, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('role', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map((member: any) => ({
      ...member,
      username: member.profiles?.username || (Array.isArray(member.profiles) ? member.profiles[0]?.username : undefined),
      avatar_url: member.profiles?.avatar_url || (Array.isArray(member.profiles) ? member.profiles[0]?.avatar_url : undefined),
    }));
  } catch (error) {
    console.error('Failed to fetch project crew:', error);
    return [];
  }
}

/**
 * Update crew member role
 */
export async function updateCrewMemberRole(
  projectId: string,
  userId: string,
  newRole: CrewRole,
  currentUserId: string,
) {
  try {
    const { data, error } = await supabase
      .from('project_crew')
      .update({ role: newRole })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the action
    await logAuditAction(
      currentUserId,
      'crew_role_changed',
      'project_crew',
      `${projectId}:${userId}`,
      { newRole, action: 'role_updated' },
    );

    return data;
  } catch (error) {
    console.error('Failed to update crew member role:', error);
    throw error;
  }
}

/**
 * Get user's projects and their roles
 */
export async function getUserProjects(userId: string) {
  try {
    const { data, error } = await supabase
      .from('project_crew')
      .select(`
        id,
        project_id,
        user_id,
        role,
        joined_at,
        projects:project_id(id, title, accent_color)
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(crew => ({
      ...crew,
      project: crew.projects,
    }));
  } catch (error) {
    console.error('Failed to fetch user projects:', error);
    return [];
  }
}
