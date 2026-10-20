'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeProgress, type ProjectProgress, type ProjectSignals } from '@/lib/os/progress';
import { fetchProjectSignals, PROGRESS_EVENT } from '@/lib/supabase/progress';
import { useUiPrefs } from '@/lib/os/uiPrefs';

/** Waits before each retry of a failed read; after the last one the error is shown. */
const RETRY_DELAYS_MS = [1000, 2000, 4000];

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

  // Bumped by every reload and on unmount / project change: a read that is no longer the latest
  // (superseded, or the component is gone) neither retries nor touches state.
  const latest = useRef(0);

  const reload = useCallback(async () => {
    if (!projectId) return;
    const mineRun = ++latest.current;
    for (let attempt = 0; ; attempt++) {
      try {
        const next = await fetchProjectSignals(projectId);
        if (latest.current !== mineRun) return;
        setGot({ projectId, signals: next });
        setError(null);
        return;
      } catch (e) {
        if (latest.current !== mineRun) return;
        if (attempt < RETRY_DELAYS_MS.length) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
          if (latest.current !== mineRun) return;
          continue;
        }
        setGot((g) => ({ projectId, signals: g?.projectId === projectId ? g.signals : null }));
        setError(e instanceof Error ? e.message : 'Could not load project progress');
        return;
      }
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads from the database, an external system
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
      latest.current++;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener(PROGRESS_EVENT, onChange);
    };
  }, [projectId, reload]);

  // "Show every tool" (the account's choice) opens everything, like the project's own switch.
  const { prefs } = useUiPrefs();
  // A throw in computeProgress becomes an error message, not a crashed page.
  const { progress, computeError } = useMemo(() => {
    if (!signals) return { progress: null, computeError: null };
    try {
      return {
        progress: computeProgress(signals, { unlockAll: signals.unlock_all || prefs.show_all_tools }),
        computeError: null,
      };
    } catch (e) {
      return {
        progress: null,
        computeError: e instanceof Error ? e.message : 'Could not compute project progress',
      };
    }
  }, [signals, prefs.show_all_tools]);
  return { signals, progress, loading, error: error ?? computeError, reload };
}
