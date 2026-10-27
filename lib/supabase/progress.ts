import { supabase } from './client';
import type { Json } from './database.types';
import { PHASE_STATUS, type Phase } from '@/lib/os/phases';
import { toSignals, type ProjectSignals } from '@/lib/os/progress';
import type { ProjectSettings } from '@/lib/types/settings';

/** Fired after anything that changes a project's progress, so every panel re-reads it. */
export const PROGRESS_EVENT = 'mc-progress-refresh';

export function announceProgressChange(projectId: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: { projectId } }));
}

/** Null when the caller can't see the project. */
export async function fetchProjectSignals(projectId: string): Promise<ProjectSignals | null> {
  const { data, error } = await supabase.rpc('project_progress', { p_project: projectId });
  if (error) throw new Error(error.message || 'Could not load project progress');
  return toSignals(data);
}

/** `projects_progress` reads at most this many ids per call. */
const BATCH = 200;

/** Signals for many projects; ones the caller can't see are absent. Asked in batches (RLS applies to each call), so no card past 200 loses its bar. */
export async function fetchProjectsSignals(projectIds: string[]): Promise<Record<string, ProjectSignals>> {
  const ids = [...new Set(projectIds)];
  if (!ids.length) return {};
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += BATCH) batches.push(ids.slice(i, i + BATCH));
  const answers = await Promise.all(batches.map(async (p_projects) => {
    const { data, error } = await supabase.rpc('projects_progress', { p_projects });
    if (error) throw new Error(error.message || 'Could not load project progress');
    return data;
  }));
  const out: Record<string, ProjectSignals> = {};
  for (const data of answers) {
    for (const [id, raw] of Object.entries((data && typeof data === 'object' ? data : {}) as Record<string, unknown>)) {
      const s = toSignals(raw);
      if (s) out[id] = s;
    }
  }
  return out;
}

/** Owner only (RLS): shelve the project, or bring it back. */
export async function setProjectArchived(projectId: string, archived: boolean): Promise<void> {
  const { data, error } = await supabase.from('projects')
    .update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', projectId).select('id');
  if (error) throw new Error(error.message || 'Could not archive the project');
  if (!data?.length) throw new Error('Only the project owner can archive it');
  announceProgressChange(projectId);
}

/** Owner only (RLS): moves the project to a phase. */
export async function setProjectPhase(projectId: string, phase: Phase): Promise<void> {
  const { data, error } = await supabase.from('projects').update({ status: PHASE_STATUS[phase] }).eq('id', projectId).select('id');
  if (error) throw new Error(error.message || 'Could not change the phase');
  if (!data?.length) throw new Error('Only the project owner can change its phase');
  announceProgressChange(projectId);
}

/**
 * Owner only: pass a phase gate — carry the listed library items forward or
 * archive them, and move the project to `phase`, in one step (the
 * advance_phase function). Returns how many were archived and carried.
 */
export async function advancePhase(projectId: string, phase: Phase, choice: { default: 'carry' | 'archive'; exceptions: string[] }): Promise<{ archived: number; carried: number }> {
  const { data, error } = await supabase.rpc('advance_phase', { p_project: projectId, p_to: PHASE_STATUS[phase], p_default: choice.default, p_exceptions: choice.exceptions });
  if (error) throw new Error(error.message || 'Could not pass the gate');
  announceProgressChange(projectId);
  const out = (data ?? {}) as { archived?: number; carried?: number };
  return { archived: out.archived ?? 0, carried: out.carried ?? 0 };
}

/** Every library item still working, all of them (the read is paged past the 1,000-row cap), for the gate. */
export async function listWorkingMedia(projectId: string): Promise<Array<{ id: string; title: string; kind: string; shared: boolean; lifecycle: string }>> {
  const out: Array<{ id: string; title: string; kind: string; shared: boolean; lifecycle: string }> = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('media').select('id, title, kind, shared, lifecycle')
      .eq('project_id', projectId).eq('lifecycle', 'working').order('id').range(from, from + PAGE - 1);
    if (error) throw new Error(error.message || 'Could not read the library');
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** Owner only (RLS): the project's format (public.project_formats). */
export async function setProjectFormat(projectId: string, format: string): Promise<void> {
  const { data, error } = await supabase.from('projects').update({ project_type: format }).eq('id', projectId).select('id');
  if (error) throw new Error(error.message || 'Could not change the format');
  if (!data?.length) throw new Error('Only the project owner can change its format');
  announceProgressChange(projectId);
}

/** Owner only (RLS). */
export async function setProjectLogline(projectId: string, logline: string): Promise<void> {
  const { data, error } = await supabase.from('projects').update({ description: logline.trim() }).eq('id', projectId).select('id');
  if (error) throw new Error(error.message || 'Could not save the logline');
  if (!data?.length) throw new Error('Only the project owner can change the logline');
  announceProgressChange(projectId);
}

/** Owner only (RLS): merges `patch` into the project's settings. */
export async function patchProjectSettings(projectId: string, patch: Partial<ProjectSettings>): Promise<ProjectSettings> {
  const { data: row, error: readError } = await supabase.from('projects').select('settings').eq('id', projectId).single();
  if (readError) throw new Error(readError.message || 'Could not load project settings');
  const settings = { ...((row?.settings as unknown as ProjectSettings) ?? {}), ...patch } as ProjectSettings;
  const { data, error } = await supabase.from('projects').update({ settings: settings as unknown as Json }).eq('id', projectId).select('id');
  if (error) throw new Error(error.message || 'Could not save project settings');
  if (!data?.length) throw new Error('Only the project owner can change this');
  announceProgressChange(projectId);
  return settings;
}

/** Owner only (RLS): open every tool now, or go back to phase by phase. */
export async function setUnlockAllTools(projectId: string, unlockAll: boolean): Promise<void> {
  await patchProjectSettings(projectId, { unlockAllTools: unlockAll });
}
