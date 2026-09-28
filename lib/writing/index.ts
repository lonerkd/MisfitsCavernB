'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { badges, localDay, summarize, type WritingDay } from './core';

export * from './core';

/**
 * A writer's loop: their goal and sprint length (profiles), their days of
 * writing (writing_days), and a queue of typed words flushed to
 * log_writing() every little while and when the tab is hidden.
 */
export function useWritingLoop(userId: string | null) {
  const [goal, setGoalState] = useState(500);
  const [sprintMinutes, setSprintState] = useState(15);
  const [rows, setRows] = useState<WritingDay[]>([]);
  const [ready, setReady] = useState(false);
  const pending = useRef(0);
  const flushing = useRef(false);

  useEffect(() => {
    if (!userId) return;
    let on = true;
    (async () => {
      const [p, d] = await Promise.all([
        supabase.rpc('get_my_writing_prefs'),
        supabase.from('writing_days').select('day, words, sprints, goal').eq('user_id', userId).order('day', { ascending: false }).limit(400),
      ]);
      if (!on) return;
      const prefs = p.data?.[0];
      if (prefs) { setGoalState(prefs.daily_word_goal); setSprintState(prefs.sprint_minutes); }
      setRows(d.data ?? []);
      setReady(true);
    })().catch(() => setReady(true));
    return () => { on = false; };
  }, [userId]);

  const apply = (row: WritingDay) => setRows((prev) => [row, ...prev.filter((r) => r.day !== row.day)]);

  /** Sends the queued words (and a finished sprint) to today's row. */
  const flush = useCallback(async (sprint = false) => {
    if (!userId || flushing.current) return;
    const words = Math.min(5000, pending.current);
    if (!words && !sprint) return;
    flushing.current = true;
    pending.current -= words;
    try {
      const { data, error } = await supabase.rpc('log_writing', { p_day: localDay(), p_words: words, p_sprint: sprint });
      if (error) throw error;
      if (data) apply({ day: data.day, words: data.words, sprints: data.sprints, goal: data.goal });
    } catch {
      pending.current += words; // keep them for the next try
    } finally {
      flushing.current = false;
    }
  }, [userId]);

  // The session's token, kept at hand so leaving the page can send what's
  // queued synchronously (an ordinary request is cancelled as the page unloads).
  const token = useRef<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    void supabase.auth.getSession().then(({ data }) => { token.current = data.session?.access_token ?? null; });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { token.current = session?.access_token ?? null; });
    return () => sub.subscription.unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const onLeave = () => {
      const words = Math.min(5000, pending.current);
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!words || !token.current || !url || !key) return;
      pending.current -= words;
      void fetch(`${url}/rest/v1/rpc/log_writing`, {
        method: 'POST',
        keepalive: true,
        headers: { apikey: key, Authorization: `Bearer ${token.current}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_day: localDay(), p_words: words, p_sprint: false }),
      }).catch(() => {});
    };
    const onHide = () => { if (document.visibilityState === 'hidden') onLeave(); };
    const id = window.setInterval(() => void flush(), 20_000);
    window.addEventListener('pagehide', onLeave);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('pagehide', onLeave);
      document.removeEventListener('visibilitychange', onHide);
      void flush();
    };
  }, [userId, flush]);

  // Save soon after typing pauses, too.
  const soon = useRef<number | null>(null);

  // Typed words show at once; the server catches up on the next flush.
  const [unsent, setUnsent] = useState(0);
  const add = useCallback((n: number) => {
    if (n <= 0) return;
    pending.current += n;
    setUnsent((u) => u + n);
    if (soon.current) window.clearTimeout(soon.current);
    soon.current = window.setTimeout(() => void flush(), 4000);
  }, [flush]);
  useEffect(() => { setUnsent(pending.current); }, [rows]);

  const savePrefs = useCallback(async (patch: { daily_word_goal?: number; sprint_minutes?: number }) => {
    if (!userId) return;
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    if (error) throw new Error(error.message);
    if (patch.daily_word_goal != null) setGoalState(patch.daily_word_goal);
    if (patch.sprint_minutes != null) setSprintState(patch.sprint_minutes);
  }, [userId]);

  const summary = useMemo(() => {
    const s = summarize(rows, localDay(), goal);
    return { ...s, today: { ...s.today, words: s.today.words + unsent } };
  }, [rows, goal, unsent]);

  return {
    ready, goal, sprintMinutes, summary, badges: badges(summary),
    add, flush,
    setGoal: (n: number) => savePrefs({ daily_word_goal: n }),
    setSprintMinutes: (n: number) => savePrefs({ sprint_minutes: n }),
  };
}

export type WritingLoop = ReturnType<typeof useWritingLoop>;
