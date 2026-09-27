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

/** Owner only (RLS): moves the project to a phase. */
export async function setProjectPhase(projectId: string, phase: Phase): Promise<void> {
  const { data, error } = await supabase.from('projects').update({ status: PHASE_STATUS[phase] }).eq('id', projectId).select('id');
  if (error) throw new Error(error.message || 'Could not change the phase');
  if (!data?.length) throw new Error('Only the project owner can change its phase');
  announceProgressChange(projectId);
}

/** Owner only (RLS). */
export async function setProjectLogline(projectId: string, logline: string): Promise<void> {
  const { data, error } = await supabase.from('projects').update({ description: logline.trim() }).eq('id', projectId).select('id');
  if (error) throw new Error(error.message || 'Could not save the logline');
  if (!data?.length) throw new Error('Only the project owner can change the logline');
  announceProgressChange(projectId);
}

/** Owner only (RLS): open every tool now, or go back to phase by phase. */
export async function setUnlockAllTools(projectId: string, unlockAll: boolean): Promise<void> {
  const { data: row, error: readError } = await supabase.from('projects').select('settings').eq('id', projectId).single();
  if (readError) throw new Error(readError.message || 'Could not load project settings');
  const settings = { ...((row?.settings as unknown as ProjectSettings) ?? {}), unlockAllTools: unlockAll };
  const { data, error } = await supabase.from('projects').update({ settings: settings as unknown as Json }).eq('id', projectId).select('id');
  if (error) throw new Error(error.message || 'Could not save project settings');
  if (!data?.length) throw new Error('Only the project owner can change this');
  announceProgressChange(projectId);
}
