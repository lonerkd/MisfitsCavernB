'use client';

// Guides, wired to the database: how someone works lives in their ui_prefs
// (lib/os/uiPrefs); what they've chosen and ticked on a project lives in
// guide_progress — theirs alone, on projects they can open.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export * from './profile';
export * from './steps';
export * from './workflows';
export * from './engine';

export interface GuideProgress {
  /** The chosen guide; null follows the project's format. */
  workflow: string | null;
  done: string[];
  hidden: boolean;
}

export const EMPTY_GUIDE_PROGRESS: GuideProgress = { workflow: null, done: [], hidden: false };

export async function loadGuideProgress(projectId: string): Promise<GuideProgress> {
  const { data, error } = await supabase.from('guide_progress').select('workflow, done, hidden').eq('project_id', projectId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { workflow: data.workflow, done: data.done ?? [], hidden: data.hidden } : EMPTY_GUIDE_PROGRESS;
}

export async function saveGuideProgress(userId: string, projectId: string, next: GuideProgress): Promise<void> {
  const { error } = await supabase.from('guide_progress')
    .upsert({ user_id: userId, project_id: projectId, workflow: next.workflow, done: next.done, hidden: next.hidden }, { onConflict: 'user_id,project_id' });
  if (error) throw new Error(error.message);
}

/** This person's guide state on a project, saved as it changes (optimistically). */
export function useGuideProgress(projectId: string | null | undefined, userId: string | null | undefined) {
  // Tagged with the project and person it belongs to; anything else is empty until loaded.
  const key = projectId && userId ? `${projectId}|${userId}` : null;
  const [state, setState] = useState<{ key: string; progress: GuideProgress; loaded: boolean } | null>(null);
  const mine = key && state?.key === key ? state : null;
  const progress = mine?.progress ?? EMPTY_GUIDE_PROGRESS;
  const loaded = mine?.loaded ?? false;
  const latest = useRef<{ key: string; progress: GuideProgress } | null>(null);
  const setProgress = useCallback((k: string, p: GuideProgress, isLoaded?: boolean) => {
    latest.current = { key: k, progress: p };
    setState((st) => ({ key: k, progress: p, loaded: isLoaded ?? (st?.key === k && st.loaded) }));
  }, []);

  useEffect(() => {
    if (!projectId || !key) return;
    let alive = true;
    loadGuideProgress(projectId)
      .then((p) => { if (alive) setProgress(key, p, true); })
      .catch(() => { if (alive) setState((st) => ({ key, progress: st?.key === key ? st.progress : EMPTY_GUIDE_PROGRESS, loaded: true })); });
    return () => { alive = false; };
  }, [projectId, key, setProgress]);

  const update = useCallback(async (patch: Partial<GuideProgress>) => {
    if (!projectId || !userId || !key) return;
    const before = latest.current?.key === key ? latest.current.progress : EMPTY_GUIDE_PROGRESS;
    const next = { ...before, ...patch };
    setProgress(key, next);
    try {
      await saveGuideProgress(userId, projectId, next);
    } catch (e) {
      setProgress(key, before);
      throw e;
    }
  }, [projectId, userId, key, setProgress]);

  return { progress, loaded, update };
}
