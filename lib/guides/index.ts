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
  const [progress, setState] = useState<GuideProgress>(EMPTY_GUIDE_PROGRESS);
  const [loaded, setLoaded] = useState(false);
  const current = useRef(progress);
  const setProgress = useCallback((p: GuideProgress) => { current.current = p; setState(p); }, []);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setProgress(EMPTY_GUIDE_PROGRESS);
    if (!projectId || !userId) return;
    loadGuideProgress(projectId)
      .then((p) => { if (alive) { setProgress(p); setLoaded(true); } })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [projectId, userId, setProgress]);

  const update = useCallback(async (patch: Partial<GuideProgress>) => {
    if (!projectId || !userId) return;
    const before = current.current;
    const next = { ...before, ...patch };
    setProgress(next);
    try {
      await saveGuideProgress(userId, projectId, next);
    } catch (e) {
      setProgress(before);
      throw e;
    }
  }, [projectId, userId, setProgress]);

  return { progress, loaded, update };
}
