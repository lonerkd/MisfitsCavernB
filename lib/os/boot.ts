import { supabase } from '@/lib/supabase/client';
import { determineUserRole, getPermissionsForRole } from './permissions';
import { logAuditAction } from '@/lib/supabase/audit';
import { osState } from './store';
import { fetchProjectDetails } from './queries';
import { syncActiveProject, syncProjectList, teardownSync } from './sync';
import type { Project, UserProfile } from './types';

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

const OFFLINE_PROFILE_KEY = 'mc_offline_profile';

// getUser() validates the token against the auth server (fails offline);
// getSession() reads the locally cached cookie session. Prefer the stricter
// call, fall back to the local one so a returning user still boots offline.
//
// getUser() is bounded: on a slow link it can take long enough that every page
// waiting on identity gives up, so after GET_USER_TIMEOUT_MS we fall back to the
// local session rather than stranding the boot.
const GET_USER_TIMEOUT_MS = 8000;

async function getOfflineSafeUser(): Promise<{ id: string; email: string | null } | null> {
  try {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), GET_USER_TIMEOUT_MS));
    const res = await Promise.race([supabase.auth.getUser(), timeout]);
    const user = res?.data.user;
    if (user) return { id: user.id, email: user.email ?? null };
  } catch { /* offline: use local session */ }
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return { id: data.session.user.id, email: data.session.user.email ?? null };
  } catch { /* not signed in */ }
  return null;
}

async function resolveSessionUser(userId: string, email: string | null) {
  const { setSession } = osState();
  let profile: any = null;

  // A transient failure here must not demote a signed-in user to anon, so retry
  // briefly before falling back to the cache / a minimal identity below.
  for (let attempt = 0; attempt < 3 && !profile; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt));
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (data) {
        profile = data;
        // Device-level cache so identity resolves on a cold start with no network.
        if (typeof window !== 'undefined') {
          localStorage.setItem(OFFLINE_PROFILE_KEY, JSON.stringify({ ...data, __uid: userId }));
        }
      }
    } catch { /* offline */ }
  }

  if (!profile && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(OFFLINE_PROFILE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.__uid === userId) profile = parsed;
      }
    } catch { /* corrupt cache */ }
  }

  // A valid auth session is the source of truth for "signed in". If the profile
  // row couldn't be read (network, or the signup trigger hasn't landed yet), run
  // on a minimal identity rather than reporting anon — anon makes every page
  // treat a signed-in user as signed out and silently drop their writes.
  if (!profile) {
    const now = new Date().toISOString();
    profile = {
      id: userId,
      email: email ?? '',
      username: email?.split('@')[0] ?? 'member',
      role: 'Creator',
      status: 'OPEN',
      created_at: now,
      updated_at: now,
    } satisfies UserProfile;
  }

  const userRole = determineUserRole(profile);
  setSession({
    status: 'authed',
    user: profile,
    userId,
    email,
    userRole,
    permissions: getPermissionsForRole(userRole),
    error: null,
  });
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


/**
 * Adopt the current Supabase session into the OS store, resolving the profile
 * and the project list. Awaited by osSignIn/osSignUp so that, the moment the
 * auth page navigates, the store is already authoritative.
 *
 * Without this the store only caught up via the onAuthStateChange listener —
 * which is async and can land *after* the destination page has rendered. Any
 * page behind useOSGate then saw status 'anon' and bounced straight back to
 * /auth, which read to users as a sign-in loop.
 */
export async function osHydrateSession(): Promise<boolean> {
  const user = await getOfflineSafeUser();
  if (!user) return false;
  await resolveSessionUser(user.id, user.email);
  await loadProjects();
  syncProjectList();
  syncActiveProject(osState().project.active?.id ?? null);
  return true;
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
    const user = await getOfflineSafeUser();
    if (user) {
      await resolveSessionUser(user.id, user.email);
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
