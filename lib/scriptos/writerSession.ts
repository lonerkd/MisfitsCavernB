// ============================================================================
// SCRIPTOS WRITER SESSION STATE
// The Stash (scratch snippets), the sprint timer length, and the daily word
// goal — durable per-script settings. Persisted on the `scripts` row
// (stash_items / daily_goal / sprint_minutes columns); not realtime, just
// loaded on mount and saved on change/debounce like the rest of ScriptOS.
// ============================================================================

import { supabase } from '@/lib/supabase/client';

export interface StashItem {
  id: string;
  text: string;
  date: number;
}

export interface WriterSessionState {
  stashItems: StashItem[];
  dailyGoal: number;
  sprintMinutes: number;
}

export function getDefaultWriterSession(): WriterSessionState {
  return { stashItems: [], dailyGoal: 1000, sprintMinutes: 15 };
}

export async function loadWriterSession(scriptId: string): Promise<WriterSessionState> {
  if (!scriptId || scriptId === 'demo') return getDefaultWriterSession();
  try {
    const { data, error } = await supabase
      .from('scripts')
      .select('stash_items, daily_goal, sprint_minutes')
      .eq('id', scriptId)
      .single();
    if (error || !data) return getDefaultWriterSession();
    return {
      stashItems: Array.isArray(data.stash_items) ? data.stash_items : [],
      dailyGoal: data.daily_goal ?? 1000,
      sprintMinutes: data.sprint_minutes ?? 15,
    };
  } catch {
    return getDefaultWriterSession();
  }
}

export async function saveWriterSession(scriptId: string, state: Partial<WriterSessionState>): Promise<void> {
  if (!scriptId || scriptId === 'demo') return;
  const patch: Record<string, any> = {};
  if (state.stashItems !== undefined) patch.stash_items = state.stashItems;
  if (state.dailyGoal !== undefined) patch.daily_goal = state.dailyGoal;
  if (state.sprintMinutes !== undefined) patch.sprint_minutes = state.sprintMinutes;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from('scripts')
    .update(patch)
    .eq('id', scriptId);
  if (error) console.error('Error saving writer session state:', error);
}
