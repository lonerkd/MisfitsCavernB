import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { osState } from './store';
import { fetchProjectDetails } from './queries';
import type { Project } from './types';

// ── Scoped realtime sync ─────────────────────────────────────────
// One channel per active project, filtered server-side to that
// project's rows. Events patch OS state arrays in place; only crew
// changes (which need a profile join) trigger a targeted refetch.

type PatchableKey = 'budget_items' | 'timeline_items' | 'scenes' | 'beats' | 'concept_assets' | 'campaigns';

const TABLE_TO_KEY: Record<string, PatchableKey> = {
  budget_items: 'budget_items',
  timeline_items: 'timeline_items',
  scenes: 'scenes',
  project_beats: 'beats',
  concept_assets: 'concept_assets',
  campaigns: 'campaigns',
};

let listChannel: RealtimeChannel | null = null;
let activeChannel: RealtimeChannel | null = null;
let activeChannelProjectId: string | null = null;

function patchActive(mutate: (active: Project) => Project) {
  const { project, setProject } = osState();
  if (!project.active) return;
  const next = mutate(project.active);
  setProject({
    active: next,
    list: project.list.map((p) => (p.id === next.id ? next : p)),
  });
}

function applyRowEvent(key: PatchableKey, eventType: string, newRow: any, oldRow: any) {
  patchActive((active) => {
    const rows: any[] = [...((active[key] as any[]) || [])];
    if (eventType === 'INSERT' && newRow) {
      if (!rows.some((r) => r.id === newRow.id)) rows.push(newRow);
    } else if (eventType === 'UPDATE' && newRow) {
      const i = rows.findIndex((r) => r.id === newRow.id);
      if (i !== -1) rows[i] = { ...rows[i], ...newRow };
      else rows.push(newRow);
    } else if (eventType === 'DELETE' && oldRow) {
      const i = rows.findIndex((r) => r.id === oldRow.id);
      if (i !== -1) rows.splice(i, 1);
    }
    if (key === 'scenes') rows.sort((a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0));
    return { ...active, [key]: rows };
  });
}

async function refreshCrew(projectId: string) {
  const { data } = await supabase
    .from('project_crew')
    .select('*, profiles!project_crew_user_id_fkey(username, avatar_url)')
    .eq('project_id', projectId);
  patchActive((active) => ({
    ...active,
    crew: (data || []).map((c: any) => ({
      id: c.id,
      name: c.profiles?.username || 'Unknown',
      role: c.role,
      avatar: c.profiles?.avatar_url || null,
      status: 'confirmed',
    })),
  }));
}

export function syncActiveProject(projectId: string | null) {
  if (activeChannelProjectId === projectId) return;

  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
    activeChannelProjectId = null;
  }
  if (!projectId) return;

  let channel = supabase.channel(`project:${projectId}`);

  for (const [table, key] of Object.entries(TABLE_TO_KEY)) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `project_id=eq.${projectId}` },
      (payload) => applyRowEvent(key, payload.eventType, payload.new, payload.old),
    );
  }

  channel = channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'project_crew', filter: `project_id=eq.${projectId}` },
      () => refreshCrew(projectId),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
      (payload) => {
        patchActive((active) => ({ ...active, ...(payload.new as Partial<Project>) }));
      },
    );

  activeChannel = channel.subscribe();
  activeChannelProjectId = projectId;
}

// Light list-level channel: keeps the project list's shallow rows
// fresh (titles, statuses, accent colors) across the suite.
export function syncProjectList() {
  if (listChannel) return;
  listChannel = supabase
    .channel('projects:list')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
      const { project, setProject } = osState();
      if (payload.eventType === 'UPDATE' && payload.new) {
        const updated = payload.new as Project;
        setProject({
          list: project.list.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
          active: project.active?.id === updated.id ? { ...project.active, ...updated } : project.active,
        });
      } else if (payload.eventType === 'INSERT' && payload.new) {
        const added = payload.new as Project;
        if (!project.list.some((p) => p.id === added.id)) {
          setProject({ list: [added, ...project.list] });
        }
      } else if (payload.eventType === 'DELETE' && payload.old) {
        const removed = payload.old as Project;
        setProject({
          list: project.list.filter((p) => p.id !== removed.id),
          active: project.active?.id === removed.id ? null : project.active,
        });
      }
    })
    .subscribe();
}

export function teardownSync() {
  if (listChannel) {
    supabase.removeChannel(listChannel);
    listChannel = null;
  }
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
    activeChannelProjectId = null;
  }
}

// Ensure a freshly activated project has its detail arrays loaded;
// pages sometimes activate a shallow list row.
export async function hydrateActiveProject(projectId: string) {
  const active = osState().project.active;
  if (active?.id === projectId && active.budget_items !== undefined) return;
  const full = await fetchProjectDetails(projectId);
  if (full && osState().project.active?.id === projectId) {
    patchActive(() => full);
  }
}
