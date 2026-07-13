import { supabase } from '@/lib/supabase/client';
import { determineUserRole, getPermissionsForRole } from './permissions';
import { logAuditAction } from '@/lib/supabase/audit';
import { osState } from './store';
import { fetchProjectDetails } from './queries';
import { syncActiveProject, syncProjectList, teardownSync } from './sync';
import type { Project } from './types';

export const ACTIVE_PROJECT_KEY = 'mc_active_project';
export const SCRIPT_POINTER_PREFIX = 'mc_active_script:';
const LEGACY_SCRIPT_KEY = 'misfits_cavern_current_script';

let booted = false;


export async function refreshActiveProject(id: string) {
  const full = await fetchProjectDetails(id);
  if (!full) return;
  const { project, setProject } = osState();
  setProject({
    active: project.active?.id === id ? full : project.active,
    list: project.list.map((p) => (p.id === id ? full : p)),
  });
}

async function resolveSessionUser(userId: string, email: string | null) {
  const { setSession } = osState();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (profile) {
    const userRole = determineUserRole(profile);
    setSession({
      status: 'authed',
      user: profile as any,
      userId,
      email,
      userRole,
      permissions: getPermissionsForRole(userRole),
      error: null,
    });
  } else {
    setSession({
      status: 'anon',
      user: null,
      userId: null,
      email: null,
      userRole: 'guest',
      permissions: getPermissionsForRole('guest'),
    });
  }
}

async function loadProjects() {
  const { setProject } = osState();
  const { data, error } = await supabase.from('projects').select('*').order('updated_at', { ascending: false });

  if (error || !data) {
    setProject({ status: 'ready' });
    return;
  }

  const rows = data as unknown as Project[];
  let active: Project | null = null;
  if (rows.length > 0) {
    const savedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_PROJECT_KEY) : null;
    const saved = savedId ? rows.find((p) => p.id === savedId) : null;
    if (savedId && !saved && typeof window !== 'undefined') localStorage.removeItem(ACTIVE_PROJECT_KEY);
    const target = saved || rows[0];
    active = (await fetchProjectDetails(target.id)) || target;
  }
  setProject({ status: 'ready', list: rows, active });
}


export function resetOS() {
  teardownSync();
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    localStorage.removeItem(LEGACY_SCRIPT_KEY);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SCRIPT_POINTER_PREFIX)) localStorage.removeItem(key);
    }
  }
  osState().resetToAnon();
}

export async function bootOS() {
  if (booted) return;
  booted = true;

  const { setSession, setProject } = osState();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await resolveSessionUser(user.id, user.email ?? null);
      await loadProjects();
      syncProjectList();
      syncActiveProject(osState().project.active?.id ?? null);
    } else {
      setSession({ status: 'anon' });
      setProject({ status: 'ready' });
    }
  } catch (error) {
    console.error('OS boot error:', error);
    setSession({ status: 'anon', error: 'Failed to initialize authentication' });
    setProject({ status: 'ready' });
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'INITIAL_SESSION') return;

    if (event === 'SIGNED_IN' && session?.user) {
      logAuditAction(session.user.id, 'user_login', 'auth', session.user.id);
    }

    if (session?.user) {
      try {
        const previousUserId = osState().session.userId;
        await resolveSessionUser(session.user.id, session.user.email ?? null);
        if (previousUserId !== session.user.id) {
          osState().setProject({ status: 'resolving', active: null, list: [] });
          await loadProjects();
          syncProjectList();
          syncActiveProject(osState().project.active?.id ?? null);
        }
      } catch (error) {
        console.error('OS session refresh error:', error);
      }
    } else {
      resetOS();
    }
  });
}
