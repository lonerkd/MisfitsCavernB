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
  // The signals, tagged with their project: another project's are never shown,
  // and a project without an answer yet is loading.
  const [got, setGot] = useState<{ projectId: string; signals: ProjectSignals | null } | null>(null);
  const mine = projectId && got?.projectId === projectId ? got : null;
  const signals = mine?.signals ?? null;
  const loading = !!projectId && !mine;
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) return;
    await fetchProjectSignals(projectId).then(
      (next) => { setGot({ projectId, signals: next }); setError(null); },
      (e) => {
        setGot((g) => ({ projectId, signals: g?.projectId === projectId ? g.signals : null }));
        setError(e instanceof Error ? e.message : 'Could not load project progress');
      },
    );
  }, [projectId]);

  useEffect(() => {
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
