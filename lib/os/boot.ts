import { supabase } from '@/lib/supabase/client';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/supabase/profile-columns';
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
// The project list as last loaded, so a cold start with no signal (a set in a
// basement) can still open the active project. Device-level, per account.
const OFFLINE_PROJECTS_KEY = 'mc_offline_projects';

// getUser() validates the token against the auth server (fails offline);
// getSession() reads the locally cached cookie session. Prefer the stricter
// call, fall back to the local one so a returning user still boots offline.
//
// getUser() is bounded: on a slow link it can take long enough that every page
// waiting on identity gives up, so after GET_USER_TIMEOUT_MS we fall back to the
// local session rather than stranding the boot.
const GET_USER_TIMEOUT_MS = 8000;

/** The device says there's no connection: don't wait on the network to find that out. */
const offlineNow = () => typeof navigator !== 'undefined' && navigator.onLine === false;

async function getOfflineSafeUser(): Promise<{ id: string; email: string | null } | null> {
  if (!offlineNow()) {
    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), GET_USER_TIMEOUT_MS));
      const res = await Promise.race([supabase.auth.getUser(), timeout]);
      const user = res?.data.user;
      if (user) return { id: user.id, email: user.email ?? null };
    } catch { /* offline: use local session */ }
  }
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return { id: data.session.user.id, email: data.session.user.email ?? null };
  } catch { /* not signed in */ }
  return null;
}

function readCachedProfile(userId: string): any {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(OFFLINE_PROFILE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return parsed?.__uid === userId ? parsed : null;
  } catch {
    return null; // corrupt cache
  }
}

// A valid auth session is the source of truth for "signed in". If the profile
// row can't be read (network, or the signup trigger hasn't landed yet), run on a
// minimal identity rather than reporting anon — anon makes every page treat a
// signed-in user as signed out and silently drop their writes.
function minimalProfile(userId: string, email: string | null): UserProfile {
  const now = new Date().toISOString();
  return {
    id: userId,
    email: email ?? '',
    username: email?.split('@')[0] ?? 'member',
    role: 'Creator',
    status: 'OPEN',
    created_at: now,
    updated_at: now,
  };
}

function setAuthed(userId: string, email: string | null, profile: any) {
  const userRole = determineUserRole(profile);
  osState().setSession({
    status: 'authed',
    user: profile,
    userId,
    email,
    userRole,
    permissions: getPermissionsForRole(userRole),
    error: null,
  });
}

async function resolveSessionUser(userId: string, email: string | null) {
  let profile: any = null;

  // A transient failure here must not demote a signed-in user to anon, so retry
  // briefly before falling back to the cache / a minimal identity below.
  for (let attempt = 0; attempt < 3 && !profile && !offlineNow(); attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt));
    try {
      const { data } = await supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).eq('id', userId).maybeSingle();
      if (data) {
        // is_admin is private (get_my_account). A failure here only means no
        // admin UI — it must never block loading the profile itself.
        const isAdmin = await Promise.resolve(supabase.rpc('get_my_account'))
          .then(({ data: account }) => account?.[0]?.is_admin ?? false)
          .catch(() => false);
        profile = { ...data, is_admin: isAdmin };
        // Device-level cache so identity resolves on a cold start with no network.
        if (typeof window !== 'undefined') {
          localStorage.setItem(OFFLINE_PROFILE_KEY, JSON.stringify({ ...data, __uid: userId }));
        }
      }
    } catch { /* offline */ }
  }

  setAuthed(userId, email, profile ?? readCachedProfile(userId) ?? minimalProfile(userId, email));
}

function readCachedProjects(userId: string | undefined): Project[] | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(OFFLINE_PROJECTS_KEY) || 'null');
    return parsed?.__uid === userId && Array.isArray(parsed.rows) ? parsed.rows as Project[] : null;
  } catch {
    return null; // corrupt cache
  }
}

async function loadProjects() {
  const { setProject } = osState();
  const userId = osState().session.user?.id;
  let data: unknown[] | null = null;
  let error: unknown = offlineNow() ? 'offline' : null;
  if (!error) {
    try {
      ({ data, error } = await supabase.from('projects').select('*').order('updated_at', { ascending: false }));
    } catch (e) { error = e; }
  }

  if (error || !data) {
    // No signal: the list as last seen on this device, if it's this account's.
    const cached = readCachedProjects(userId);
    if (!cached) { setProject({ status: 'ready' }); return; }
    const savedId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_PROJECT_KEY) : null;
    setProject({ status: 'ready', list: cached, active: cached.find((p) => p.id === savedId) ?? cached[0] ?? null });
    return;
  }

  const rows = data as unknown as Project[];
  if (typeof window !== 'undefined' && userId) {
    try { localStorage.setItem(OFFLINE_PROJECTS_KEY, JSON.stringify({ __uid: userId, rows })); } catch { /* full: no offline copy */ }
  }
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

/**
 * Adopt a session the caller has just established (sign-in / sign-up), without
 * waiting on the network. The store flips to 'authed' immediately — from the
 * cached profile, else a minimal identity — so the auth page can navigate at
 * once; the real profile, project list and realtime sync then load in the
 * background. Blocking sign-in on that whole chain meant any slowness stranded
 * the user on /auth, already signed in, behind a "taking too long" error.
 */
export function osAdoptSession(user: { id: string; email?: string | null }) {
  const email = user.email ?? null;
  setAuthed(user.id, email, readCachedProfile(user.id) ?? minimalProfile(user.id, email));
  osState().setProject({ status: 'resolving' });
  void (async () => {
    await resolveSessionUser(user.id, email);
    await loadProjects();
    syncProjectList();
    syncActiveProject(osState().project.active?.id ?? null);
  })().catch((error) => {
    console.error('OS session adopt error:', error);
    osState().setProject({ status: 'ready' });
  });
}

export function resetOS() {
  teardownSync();
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    localStorage.removeItem(LEGACY_SCRIPT_KEY);
    localStorage.removeItem(OFFLINE_PROJECTS_KEY);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      // Script pointers, and the on-set copies of a day (a shared device on set).
      if (key && (key.startsWith(SCRIPT_POINTER_PREFIX) || key.startsWith('mc:onset-'))) localStorage.removeItem(key);
    }
  }
  osState().resetToAnon();
}

export async function bootOS() {
  if (booted) return;
  booted = true;

  const { setSession, setProject } = osState();

  try {
    // Adopt the locally stored session immediately (no network), so every page of
    // the suite opens already signed in instead of waiting on an auth round trip.
    // The server still validates the token (middleware on every gated request,
    // RLS on every query); the background check below only signs the client out
    // when the auth server explicitly rejects the session.
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (user) {
      osAdoptSession(user);
      supabase.auth.getUser().then(({ data: fresh, error }) => {
        const rejected = !fresh.user && error && (error.status === 401 || error.status === 403);
        if (rejected) resetOS();
      }).catch(() => { /* offline: keep the local session */ });
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
