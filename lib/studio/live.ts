'use client';

// useLiveRows: a list that is loaded once and then kept current by Realtime.
//
// Order matters for correctness: subscribe first, then load, so a change made
// between the two is never lost. Realtime echoes of our own writes are merged
// idempotently (newer updated_at wins), and every (re)connect reloads, so a
// dropped socket can't leave the list silently stale.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export type LiveStatus = 'loading' | 'ready' | 'error';

type Row = Record<string, unknown>;

export interface LiveRowsOptions<T extends Row> {
  /** Null disables the hook (nothing selected yet). */
  scope: string | null;
  table: string;
  /** Realtime filter for INSERT/UPDATE, e.g. `project_id=eq.<id>`. */
  filter: string;
  load: () => Promise<T[]>;
  keyOf: (row: Partial<T>) => string;
  /** Rows that should not be in the list (e.g. soft-removed scenes). */
  exclude?: (row: T) => boolean;
  sort?: (a: T, b: T) => number;
}

export interface LiveRows<T> {
  rows: T[];
  status: LiveStatus;
  error: string | null;
  reload: () => Promise<void>;
  /** Apply a row we just wrote, without waiting for its Realtime echo. */
  upsertLocal: (row: T) => void;
  removeLocal: (key: string) => void;
}

function newer(a: Row | undefined, b: Row): boolean {
  const ta = a?.updated_at as string | undefined;
  const tb = b.updated_at as string | undefined;
  return !ta || !tb || tb >= ta;
}

export function useLiveRows<T extends Row>(opts: LiveRowsOptions<T>): LiveRows<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [status, setStatus] = useState<LiveStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const generation = useRef(0);
  // Writes applied locally, so a reload that started before them can't erase
  // them (its snapshot may predate the write).
  const localWrites = useRef(new Map<string, { at: number; row: T | null }>());

  const finish = useCallback((list: T[]) => {
    const { exclude, sort } = optsRef.current;
    const kept = exclude ? list.filter((r) => !exclude(r)) : list;
    return sort ? [...kept].sort(sort) : kept;
  }, []);

  const reload = useCallback(async () => {
    const gen = generation.current;
    const startedAt = Date.now();
    try {
      const data = await optsRef.current.load();
      if (gen !== generation.current) return;
      const { keyOf } = optsRef.current;
      const merged = new Map(data.map((r) => [keyOf(r), r] as const));
      localWrites.current.forEach((w, key) => {
        if (w.at < startedAt) { localWrites.current.delete(key); return; }
        if (w.row) merged.set(key, w.row);
        else merged.delete(key);
      });
      setRows(finish(Array.from(merged.values())));
      setStatus('ready');
      setError(null);
    } catch (e) {
      if (gen !== generation.current) return;
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Could not load');
    }
  }, [finish]);

  const upsertLocal = useCallback((row: T) => {
    const key = optsRef.current.keyOf(row);
    localWrites.current.set(key, { at: Date.now(), row });
    setRows((prev) => {
      const i = prev.findIndex((r) => optsRef.current.keyOf(r) === key);
      if (i === -1) return finish([...prev, row]);
      if (!newer(prev[i], row)) return prev;
      const next = [...prev];
      next[i] = { ...prev[i], ...row };
      return finish(next);
    });
  }, [finish]);

  const removeLocal = useCallback((key: string) => {
    localWrites.current.set(key, { at: Date.now(), row: null });
    setRows((prev) => prev.filter((r) => optsRef.current.keyOf(r) !== key));
  }, []);

  const { scope, table, filter } = opts;
  useEffect(() => {
    generation.current++;
    localWrites.current.clear();
    setRows([]);
    setError(null);
    if (!scope) { setStatus('ready'); return; }
    setStatus('loading');

    const onChange = (payload: RealtimePostgresChangesPayload<T>) => {
      if (payload.eventType === 'DELETE') {
        const old = payload.old as Partial<T>;
        if (old) removeLocal(optsRef.current.keyOf(old));
      } else if (payload.new) {
        upsertLocal(payload.new as T);
      }
    };

    const channel: RealtimeChannel = supabase
      .channel(`live:${table}:${scope}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, onChange)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, onChange)
      // DELETE events carry only the primary key, so they can't be filtered by
      // project; removing an unknown key is a no-op.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, onChange)
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') void reload();
      });

    // Load immediately too — Realtime may be slow to connect or unavailable.
    void reload();

    const onVisible = () => { if (document.visibilityState === 'visible') void reload(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [scope, table, filter, reload, upsertLocal, removeLocal]);

  return { rows, status, error, reload, upsertLocal, removeLocal };
}
