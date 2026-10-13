'use client';

// "View as": a project's owner previewing the suite as someone else sees it.
// It changes only what the interface shows — never what the database allows
// (that is RLS) — so it is honest about being a preview. Per device and per
// project, kept for the tab's session; the owner can always switch back.

import { useCallback, useSyncExternalStore } from 'react';

export type ViewAsMode = 'owner' | 'crew' | 'outsider';

const KEY = 'mc_view_as';
const listeners = new Set<() => void>();
let memory: Record<string, ViewAsMode> | null = null;

const isMode = (v: unknown): v is ViewAsMode => v === 'owner' || v === 'crew' || v === 'outsider';

function read(): Record<string, ViewAsMode> {
  if (memory) return memory;
  memory = {};
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) || '{}');
    for (const [id, mode] of Object.entries(raw)) if (isMode(mode) && mode !== 'owner') memory[id] = mode;
  } catch { /* no storage: the preview lasts until the page reloads */ }
  return memory;
}

export function setViewAs(projectId: string, mode: ViewAsMode): void {
  const next = { ...read() };
  if (mode === 'owner') delete next[projectId]; else next[projectId] = mode;
  memory = next;
  try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** The mode this project is being previewed in; 'owner' (the real view) unless the owner chose otherwise. */
export function useViewAs(projectId: string | null | undefined): ViewAsMode {
  const get = useCallback(() => (projectId ? read()[projectId] ?? 'owner' : 'owner'), [projectId]);
  return useSyncExternalStore(subscribe, get, () => 'owner');
}

/** Only a real owner can preview, and only the "owner" mode keeps owner controls. */
export function effectiveOwner(realOwner: boolean, mode: ViewAsMode): boolean {
  return realOwner && mode === 'owner';
}

export const VIEW_AS_LABEL: Record<ViewAsMode, string> = { owner: 'Me', crew: 'Crew', outsider: 'Outsider' };
