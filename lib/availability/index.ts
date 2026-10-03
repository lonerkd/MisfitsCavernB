'use client';

// Crew availability, wired up: your own dates away (public.unavailability,
// yours alone), and — for the people who plan a production — who on it is
// away (project_availability(), dates only).

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Away } from './core';

export * from './core';

/** Today in the viewer's time zone, as YYYY-MM-DD. */
export const localToday = () => new Date().toLocaleDateString('en-CA');

export interface MyAway { id: string; starts_on: string; ends_on: string; note: string | null }

export function useMyUnavailability(userId: string | null | undefined) {
  const [rows, setRows] = useState<MyAway[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    await supabase.from('unavailability').select('id, starts_on, ends_on, note').order('starts_on').then(({ data, error: e }) => {
      if (e) setError(e.message); else { setRows(data ?? []); setError(null); }
      setLoaded(true);
    });
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(async (r: { starts_on: string; ends_on: string; note: string | null }) => {
    const { data, error: e } = await supabase.from('unavailability').insert({ user_id: userId!, ...r }).select('id, starts_on, ends_on, note').single();
    if (e) throw new Error(e.message);
    setRows((xs) => [...xs, data].sort((a, b) => a.starts_on.localeCompare(b.starts_on)));
  }, [userId]);

  const remove = useCallback(async (id: string) => {
    const { error: e } = await supabase.from('unavailability').delete().eq('id', id);
    if (e) throw new Error(e.message);
    setRows((xs) => xs.filter((x) => x.id !== id));
  }, []);

  return { rows, loaded, error, add, remove };
}

const NO_AWAY: Away[] = [];

/** Who on a production is away (from today on). Empty unless the caller plans the production. */
export function useProjectAvailability(projectId: string | null | undefined, enabled = true) {
  const key = projectId && enabled ? projectId : null;
  const [got, setGot] = useState<{ projectId: string; rows: Away[] } | null>(null);
  useEffect(() => {
    if (!key) return;
    let alive = true;
    supabase.rpc('project_availability', { p_project: key })
      .then(({ data }) => { if (alive) setGot({ projectId: key, rows: (data ?? []) as Away[] }); });
    return () => { alive = false; };
  }, [key]);
  return key && got?.projectId === key ? got.rows : NO_AWAY;
}
