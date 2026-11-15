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

// ── A role to preview ───────────────────────────────────────────────────────────
// "Crew" is not one person: a gaffer and an accountant see different screens. While previewing as crew the owner can choose the
// craft and the access level to preview as, and every screen that follows a person's capabilities shows what that role sees.
// As honest as the rest of "view as": it changes only what the interface shows, never what the database allows.

export type PreviewTier = 'lead' | 'contributor' | 'viewer';
export interface PreviewRole { craft: string | null; tier: PreviewTier }

const ROLE_KEY = 'mc_view_as_role';
const DEFAULT_ROLE: PreviewRole = { craft: null, tier: 'contributor' };
let roleMemory: Record<string, PreviewRole> | null = null;

const isTier = (v: unknown): v is PreviewTier => v === 'lead' || v === 'contributor' || v === 'viewer';

function readRoles(): Record<string, PreviewRole> {
  if (roleMemory) return roleMemory;
  roleMemory = {};
  try {
    const raw = JSON.parse(sessionStorage.getItem(ROLE_KEY) || '{}');
    for (const [id, r] of Object.entries(raw as Record<string, { craft?: unknown; tier?: unknown }>)) {
      if (r && isTier(r.tier)) roleMemory[id] = { craft: typeof r.craft === 'string' ? r.craft : null, tier: r.tier };
    }
  } catch { /* no storage: the choice lasts until the page reloads */ }
  return roleMemory;
}

export function setViewAsRole(projectId: string, role: PreviewRole): void {
  const next = { ...readRoles(), [projectId]: role };
  roleMemory = next;
  try { sessionStorage.setItem(ROLE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

/** The role chosen to preview as on this project (an unnamed crew member with ordinary access until one is chosen). */
export function useViewAsRole(projectId: string | null | undefined): PreviewRole {
  const get = useCallback(() => (projectId ? readRoles()[projectId] ?? DEFAULT_ROLE : DEFAULT_ROLE), [projectId]);
  return useSyncExternalStore(subscribe, get, () => DEFAULT_ROLE);
}

export const VIEW_AS_LABEL: Record<ViewAsMode, string> = { owner: 'Me', crew: 'Crew', outsider: 'Outsider' };
