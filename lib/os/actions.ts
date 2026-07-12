import { supabase, type Database } from '@/lib/supabase/client';
import { hasPermission, getProjectPermissions, type ProjectRole } from './permissions';
import { logAuditAction } from '@/lib/supabase/audit';
import type { Permission, AccessContext, UserRole } from '@/lib/context/types';
import { osState } from './store';
import { resetOS, refreshActiveProject, ACTIVE_PROJECT_KEY } from './boot';
import { fetchProjectDetails } from './queries';
import { syncActiveProject, hydrateActiveProject } from './sync';
import { osNotify } from './notify';
import type { Project } from './types';

// ── Session actions ──────────────────────────────────────────────
export async function osSignIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    osState().setSession({ error: error.message || 'Sign in failed' });
    throw error;
  }
}

export async function osSignUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) {
    osState().setSession({ error: error.message || 'Sign up failed' });
    throw error;
  }
  if (data.user) {
    await supabase.from('profiles').upsert(
      { id: data.user.id, username, status: 'OPEN' },
      { onConflict: 'id', ignoreDuplicates: true }
    );
  }
  return data;
}

export async function osSignOut() {
  const loggedOutUserId = osState().session.userId;
  const { error } = await supabase.auth.signOut();
  if (error) {
    osState().setSession({ error: error.message || 'Sign out failed' });
    throw error;
  }
  if (loggedOutUserId) logAuditAction(loggedOutUserId, 'user_logout', 'auth', loggedOutUserId);
  resetOS();
}

// ── Project actions ──────────────────────────────────────────────
export function osSetActiveProject(project: Project | null) {
  osState().setProject({ active: project });
  if (typeof window !== 'undefined') {
    if (project?.id) localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
    else localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
  syncActiveProject(project?.id ?? null);
  if (project?.id) hydrateActiveProject(project.id);
}

export async function osRefreshProject(id: string) {
  const full = await fetchProjectDetails(id);
  if (full) {
    const { project, setProject } = osState();
    setProject({
      active: project.active?.id === id || !project.active ? full : project.active,
      list: project.list.map((p) => (p.id === id ? full : p)),
    });
    if (project.active?.id === id) osSetActiveProject(full);
  }
}

export async function osUpdateProject(id: string, updates: Partial<Project>) {
  const { error } = await supabase
    .from('projects')
    .update(updates as unknown as Database['public']['Tables']['projects']['Update'])
    .eq('id', id);

  if (error) {
    osNotify('Failed to update project. Please try again.', 'error');
    await refreshActiveProject(id);
  }
}

// ── Project access ───────────────────────────────────────────────
export async function osLoadProjectAccess(projectId: string) {
  const { session, setSession } = osState();
  if (!session.userId) return;

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, creator_id')
      .eq('id', projectId)
      .single();

    if (!project) return;

    let projectRole: ProjectRole = 'viewer';

    if (project.creator_id === session.userId) {
      projectRole = 'owner';
    } else {
      const { data: crewMember } = await supabase
        .from('project_crew')
        .select('role, status')
        .eq('project_id', projectId)
        .eq('user_id', session.userId)
        .single();

      if (crewMember && crewMember.status === 'confirmed') {
        projectRole = crewMember.role === 'lead' ? 'lead' : 'contributor';
      }
    }

    const projectPermissions = getProjectPermissions(projectRole);

    setSession({
      projectAccess: {
        ...osState().session.projectAccess,
        [projectId]: {
          projectId,
          userRole: projectRole,
          permissions: projectPermissions,
          canEdit: projectRole === 'owner' || projectRole === 'lead',
          canDelete: projectRole === 'owner',
          canManageCrew: projectRole === 'owner' || projectRole === 'lead',
          canViewScripts: true,
          canEditScripts: projectRole !== 'viewer',
          canCreateScripts: projectRole !== 'viewer',
        },
      },
    });
  } catch (error) {
    console.error('Error loading project access:', error);
  }
}

// ── Permission checks ────────────────────────────────────────────
export function osCanPerformAction(action: Permission, context?: AccessContext): boolean {
  const { session } = osState();
  if (!hasPermission(session.userRole, action)) return false;
  if (context?.projectId) {
    const access = session.projectAccess[context.projectId];
    if (access) return access.permissions.includes(action);
  }
  return true;
}

export function osCheckProjectAccess(projectId: string, permission: Permission): boolean {
  const access = osState().session.projectAccess[projectId];
  if (!access) return false;
  return access.permissions.includes(permission);
}

export function osHasRole(role: UserRole): boolean {
  return osState().session.userRole === role;
}
