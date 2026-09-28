'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeProgress, type ProjectProgress, type ProjectSignals } from '@/lib/os/progress';
import { fetchProjectSignals, PROGRESS_EVENT } from '@/lib/supabase/progress';
import { useUiPrefs } from '@/lib/os/uiPrefs';

export interface ProjectProgressState {
  signals: ProjectSignals | null;
  progress: ProjectProgress | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * The project's phase, milestones and unlocked tools, read from its data.
 * Re-reads when the window regains focus (work done in another tab) and when
 * anything on the page announces a change (announceProgressChange).
 */
export function useProjectProgress(projectId: string | null | undefined): ProjectProgressState {
  const [signals, setSignals] = useState<ProjectSignals | null>(null);
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) { setSignals(null); setLoading(false); return; }
    try {
      setSignals(await fetchProjectSignals(projectId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load project progress');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setSignals(null);
    setLoading(!!projectId);
    void reload();
    if (!projectId) return;
    const onFocus = () => { if (document.visibilityState === 'visible') void reload(); };
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<{ projectId?: string }>).detail?.projectId;
      if (!id || id === projectId) void reload();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener(PROGRESS_EVENT, onChange);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener(PROGRESS_EVENT, onChange);
    };
  }, [projectId, reload]);

  // "Show every tool" (the account's choice) opens everything, like the project's own switch.
  const { prefs } = useUiPrefs();
  const progress = useMemo(
    () => (signals ? computeProgress(signals, { unlockAll: signals.unlock_all || prefs.show_all_tools }) : null),
    [signals, prefs.show_all_tools],
  );
  return { signals, progress, loading, error, reload };
}
