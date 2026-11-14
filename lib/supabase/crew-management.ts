import { supabase } from './client';
import { logAuditAction } from './audit';
import { logActivity } from './activity';
import { notify } from './notifications';

/** Permission on the project (project_crew.role); what they do is `craft`. */
export type CrewRole = 'lead' | 'contributor' | 'viewer';

export interface CrewMember {
  id: string;
  project_id: string;
  user_id: string;
  role: CrewRole;
  /** Their craft on this project (public.crafts). */
  craft: string | null;
  joined_at: string;
  status: 'pending' | 'confirmed' | 'declined';
  username?: string;
  avatar_url?: string;
}

export async function assignCrewMember(
  projectId: string,
  userId: string,
  role: CrewRole,
  currentUserId: string,
  /** Their craft on the project — e.g. the craft of the job they were hired for. */
  craft?: string | null,
) {
  try {
    const { data, error } = await supabase
      .from('project_crew')
      .upsert(
        {
          project_id: projectId,
          user_id: userId,
          role: role,
          ...(craft !== undefined ? { craft } : {}),
        },
        { onConflict: 'project_id,user_id' },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    void logActivity(`assigned a crew member as ${role}`, 'project', projectId);

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

export async function getProjectCrew(projectId: string): Promise<CrewMember[]> {
  try {

    const { data, error } = await supabase
      .from('project_crew')
      .select(`
        id,
        project_id,
        user_id,
        role,
        craft,
        status,
        created_at,
        profiles:user_id(username, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('role', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map((member: any) => ({
      ...member,
      joined_at: member.created_at,
      username: member.profiles?.username || (Array.isArray(member.profiles) ? member.profiles[0]?.username : undefined),
      avatar_url: member.profiles?.avatar_url || (Array.isArray(member.profiles) ? member.profiles[0]?.avatar_url : undefined),
    }));
  } catch (error) {
    console.error('Failed to fetch project crew:', error);
    return [];
  }
}

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

    void logActivity(`changed a crew member's role to ${newRole}`, 'project', projectId);

    await logAuditAction(
      currentUserId,
      'crew_role_changed',
      'project_crew',
      `${projectId}:${userId}`,
      { newRole, action: 'role_updated' },
    );

    // Tell the member — a role change otherwise only reaches the admin audit log.
    await notify(
      userId,
      { type: 'crew', title: `Your role is now ${newRole}`, body: 'Your access on this project was updated.', link: `/projects/${projectId}` },
      currentUserId,
    );

    return data;
  } catch (error) {
    console.error('Failed to update crew member role:', error);
    throw error;
  }
}

/**
 * Changes what someone does on this project (their craft, a name from public.crafts); null clears it.
 * Only the project's owner can (the database says so). It never touches their permission tier.
 */
export async function setCrewCraft(projectId: string, userId: string, craft: string | null, currentUserId: string) {
  const { data, error } = await supabase
    .from('project_crew')
    .update({ craft })
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .select('user_id, craft');
  if (error) throw error;
  // Row security hides a row you may not change, so "nothing updated" has to be said, not treated as success.
  if (!data?.length) throw new Error('You cannot change this person’s craft.');

  void logActivity(craft ? `set a crew member's craft to ${craft}` : `cleared a crew member's craft`, 'project', projectId);
  await logAuditAction(currentUserId, 'crew_role_changed', 'project_crew', `${projectId}:${userId}`, { craft, action: 'craft_updated' });
  if (userId !== currentUserId) {
    await notify(
      userId,
      { type: 'crew', title: craft ? `Your craft is now ${craft}` : 'Your craft on this project was cleared', body: 'Updated by the project owner.', link: `/projects/${projectId}` },
      currentUserId,
    );
  }
  return data[0];
}

export interface TeamMember { id: string; name: string; role: string; avatar: string | null | undefined }

/** A project's people: its owner first, then the crew (each once). */
export async function getProjectTeam(projectId: string, ownerId: string | null | undefined): Promise<TeamMember[]> {
  const [crew, owner] = await Promise.all([
    supabase.from('project_crew').select('user_id, role, craft, profiles!project_crew_user_id_fkey(username, avatar_url)').eq('project_id', projectId),
    ownerId ? supabase.from('profiles').select('id, username, avatar_url').eq('id', ownerId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (crew.error) throw crew.error;
  if (owner.error) throw owner.error;
  const o = owner.data;
  return [
    ...(o ? [{ id: o.id, name: o.username || 'Owner', role: 'Owner', avatar: o.avatar_url }] : []),
    ...(crew.data ?? [])
      .filter((c) => c.user_id !== o?.id)
      .map((c) => ({ id: c.user_id, name: c.profiles?.username || 'Crew', role: c.craft || (c.role === 'lead' ? 'Lead' : 'Crew'), avatar: c.profiles?.avatar_url })),
  ];
}


/** This person's craft on a project they're crew on; null when none (or not crew). */
export async function getMyCraftOn(projectId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('project_crew').select('craft').eq('project_id', projectId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.craft ?? null;
}

/** An open invitation to join a project's crew, as its invitee sees it (they cannot read the project itself yet). */
export interface CrewInvitation {
  project_id: string;
  title: string;
  /** The access they are offered: lead, crew or view-only. */
  role: CrewRole;
  /** What they would do on the project. */
  craft: string | null;
  invited_by_name: string | null;
  created_at: string;
}

/** The signed-in person's open invitations, newest first. */
export async function getMyInvitations(): Promise<CrewInvitation[]> {
  const { data, error } = await supabase.rpc('my_crew_invitations');
  if (error) throw error;
  return (data ?? []) as CrewInvitation[];
}

/** Accept or decline the signed-in person's own open invitation; the person who invited them is told. */
export async function respondToInvitation(projectId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_to_crew_invitation', { p_project: projectId, p_accept: accept });
  if (error) throw error;
}
