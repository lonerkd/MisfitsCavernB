import { supabase, type Database } from '@/lib/supabase/client';
import { logAuditAction } from '@/lib/supabase/audit';
import { osState } from './store';
import { resetOS, refreshActiveProject, osAdoptSession, ACTIVE_PROJECT_KEY } from './boot';
import { fetchProjectDetails } from './queries';
import { syncActiveProject, hydrateActiveProject } from './sync';
import { osNotify } from './notify';
import type { Project } from './types';

// ── Session actions ──────────────────────────────────────────────
export async function osSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    osState().setSession({ error: error.message || 'Sign in failed' });
    throw error;
  }
  // Mark the store authed BEFORE the caller navigates, so a gated page can never
  // render while it still says 'anon'; profile + projects load in the background.
  osAdoptSession(data.user);
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
  // Profile row is created by the DB trigger on_auth_user_created
  // (public.handle_new_user) from options.data.username.
  //
  // With email confirmation enabled signUp returns no session: stay 'anon' and
  // let the caller show its "check your email" message.
  if (data.session && data.user) osAdoptSession(data.user);
  else osState().setSession({ status: 'anon' });
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
