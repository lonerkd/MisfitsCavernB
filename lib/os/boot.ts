import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { determineUserRole, getPermissionsForRole } from './permissions';
import { logAuditAction } from '@/lib/supabase/audit';
import { osState } from './store';
import type { Project } from './types';

export const ACTIVE_PROJECT_KEY = 'mc_active_project';
export const SCRIPT_POINTER_PREFIX = 'mc_active_script:';
const LEGACY_SCRIPT_KEY = 'misfits_cavern_current_script';

let booted = false;
let projectChannel: RealtimeChannel | null = null;

export async function fetchProjectDetails(projectId: string): Promise<Project | null> {
  const [projectRes, budgetRes, timelineRes, crewRes, beatsRes, conceptRes, scenesRes, campaignsRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('budget_items').select('*').eq('project_id', projectId),
    supabase.from('timeline_items').select('*').eq('project_id', projectId),
    supabase.from('project_crew').select('*, profiles!project_crew_user_id_fkey(username, avatar_url)').eq('project_id', projectId),
    supabase.from('project_beats').select('*').eq('project_id', projectId).order('created_at'),
    supabase.from('concept_assets').select('*').eq('project_id', projectId).order('created_at'),
    supabase.from('scenes').select('*').eq('project_id', projectId).order('scene_number'),
    supabase.from('campaigns').select('*').eq('project_id', projectId).order('created_at'),
  ]);

  if (!projectRes.data) return null;
  return {
    ...projectRes.data,
    budget_items: budgetRes.data || [],
    timeline_items: timelineRes.data || [],
    crew: (crewRes.data || []).map((c: any) => ({
      id: c.id,
      name: c.profiles?.username || 'Unknown',
      role: c.role,
      avatar: c.profiles?.avatar_url || null,
      status: 'confirmed',
    })),
    beats: beatsRes.data || [],
    concept_assets: conceptRes.data || [],
    scenes: scenesRes.data || [],
    campaigns: campaignsRes.data || [],
  } as unknown as Project;
}

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

function subscribeRealtime() {
  if (projectChannel) return;
  projectChannel = supabase
    .channel('project-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
      if (payload.eventType === 'UPDATE') {
        const updated = payload.new as Project;
        const { project, setProject } = osState();
        setProject({
          list: project.list.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
          active: project.active?.id === updated.id ? { ...project.active, ...updated } : project.active,
        });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_items' }, (payload) => {
      const item = (payload.new || payload.old) as any;
      if (osState().project.active?.id === item.project_id) refreshActiveProject(item.project_id);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'timeline_items' }, (payload) => {
      const item = (payload.new || payload.old) as any;
      if (osState().project.active?.id === item.project_id) refreshActiveProject(item.project_id);
    })
    .subscribe();
}

function unsubscribeRealtime() {
  if (projectChannel) {
    supabase.removeChannel(projectChannel);
    projectChannel = null;
  }
}

export function resetOS() {
  unsubscribeRealtime();
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
      subscribeRealtime();
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
          subscribeRealtime();
        }
      } catch (error) {
        console.error('OS session refresh error:', error);
      }
    } else {
      resetOS();
    }
  });
}
