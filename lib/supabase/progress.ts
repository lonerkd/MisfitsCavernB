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

/** Signals for many projects in one call; ones the caller can't see are absent. */
export async function fetchProjectsSignals(projectIds: string[]): Promise<Record<string, ProjectSignals>> {
  if (!projectIds.length) return {};
  const { data, error } = await supabase.rpc('projects_progress', { p_projects: projectIds.slice(0, 200) });
  if (error) throw new Error(error.message || 'Could not load project progress');
  const out: Record<string, ProjectSignals> = {};
  for (const [id, raw] of Object.entries((data ?? {}) as Record<string, unknown>)) {
    const s = toSignals(raw);
    if (s) out[id] = s;
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
