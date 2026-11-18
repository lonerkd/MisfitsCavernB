'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { findRecords } from '@/lib/studio/record-find';

// One search box per tool, in the tool's header. The Production tab provides the context; a tool that keeps a list of
// records says so by calling useRecordFind(items), which also gives it the narrowed list to show. The query is cleared when
// the person moves to another tool (the provider is keyed by the tool).

interface ToolFind {
  q: string;
  setQ: (q: string) => void;
  /** True once a list in this tool has registered itself as searchable. */
  searchable: boolean;
  /** How many records matched, out of how many (for the "n of m" line). */
  counts: { shown: number; total: number } | null;
  register: (counts: { shown: number; total: number } | null) => void;
}

const Ctx = createContext<ToolFind | null>(null);

export function ToolFindProvider({ children }: { children: React.ReactNode }) {
  const [q, setQ] = useState('');
  const [counts, setCounts] = useState<{ shown: number; total: number } | null>(null);
  const register = useCallback((c: { shown: number; total: number } | null) => setCounts((prev) => (prev && c && prev.shown === c.shown && prev.total === c.total ? prev : c)), []);
  const value = useMemo<ToolFind>(() => ({ q, setQ, searchable: counts !== null, counts, register }), [q, counts, register]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Which tool is open ("production:safety"), so the header can say who else has it open. Null outside a Production tool. */
export const ToolHereContext = createContext<string | null>(null);

/** The tool's search state (the header reads this); null outside a Production tool. */
export const useToolFind = () => useContext(Ctx);

/** Narrow a tool's records to the person's search, and tell the header the tool has a list worth searching. */
export function useRecordFind<T extends Record<string, unknown>>(items: readonly T[], enabled = true): { shown: T[]; q: string } {
  const ctx = useContext(Ctx);
  const q = enabled ? (ctx?.q ?? '') : '';
  const shown = useMemo(() => findRecords(items, q), [items, q]);
  const register = enabled ? ctx?.register : undefined;
  const total = items.length;
  const count = shown.length;
  useEffect(() => {
    register?.(total > 0 ? { shown: count, total } : null);
    return () => register?.(null);
  }, [register, total, count]);
  return { shown, q };
}
