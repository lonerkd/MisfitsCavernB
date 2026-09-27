'use client';

// The breakdown, live: categories, elements, scene tags and dismissed
// suggestions for a project, kept current by Realtime so a tag made in the
// editor shows up in the Studio (and on a crewmate's screen) without a reload.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useLiveRows } from '@/lib/studio/live';
import { createBreakdownApi } from './api';
import { EMPTY_MEMORY, indexMemory, type BreakdownCategory, type BreakdownElement, type BreakdownMemory, type SceneElementTag } from './core';

export * from './core';
export type { ElementPatch, CategoryPatch } from './api';
export { BUDGET_PREFIX } from './api';
export const breakdown = createBreakdownApi(supabase);

type Dismissal = { project_id: string; name_key: string };

export function useBreakdown(projectId: string | null) {
  const categories = useLiveRows<BreakdownCategory>({
    scope: projectId, table: 'breakdown_categories', filter: `project_id=eq.${projectId}`,
    load: async () => (await breakdown.listCategories(projectId!)),
    keyOf: (x) => String(x.id),
    sort: (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  });
  const elements = useLiveRows<BreakdownElement>({
    scope: projectId, table: 'breakdown_elements', filter: `project_id=eq.${projectId}`,
    load: async () => (await breakdown.listElements(projectId!)),
    keyOf: (x) => String(x.id),
    sort: (a, b) => a.name.localeCompare(b.name),
  });
  const tags = useLiveRows<SceneElementTag>({
    scope: projectId, table: 'scene_elements', filter: `project_id=eq.${projectId}`,
    load: async () => (await breakdown.listTags(projectId!)),
    keyOf: (x) => `${x.scene_id}:${x.element_id}`,
  });
  const dismissals = useLiveRows<Dismissal>({
    scope: projectId, table: 'breakdown_dismissals', filter: `project_id=eq.${projectId}`,
    load: async () => (await breakdown.listDismissed(projectId!)),
    keyOf: (x) => `${x.project_id}:${x.name_key}`,
  });

  const dismissed = useMemo(() => new Set(dismissals.rows.map((d) => d.name_key)), [dismissals.rows]);
  const elementById = useMemo(() => new Map(elements.rows.map((e) => [e.id, e])), [elements.rows]);
  const categoryById = useMemo(() => new Map(categories.rows.map((c) => [c.id, c])), [categories.rows]);
  const status = [categories, elements, tags, dismissals].some((l) => l.status === 'loading') ? 'loading'
    : [categories, elements, tags, dismissals].some((l) => l.status === 'error') ? 'error' : 'ready';
  const error = categories.error || elements.error || tags.error || dismissals.error;

  return { categories, elements, tags, dismissals, dismissed, elementById, categoryById, status, error };
}

/**
 * What the signed-in user has tagged in their other projects, so suggestions
 * here are filed the way they filed them there. Read once per project; it
 * only informs suggestions, so a failure just means none from memory.
 */
export function useBreakdownMemory(projectId: string | null): BreakdownMemory {
  const [memory, setMemory] = useState<BreakdownMemory>(EMPTY_MEMORY);
  useEffect(() => {
    if (!projectId) { setMemory(EMPTY_MEMORY); return; }
    let alive = true;
    breakdown.memory(projectId).then((rows) => { if (alive) setMemory(indexMemory(rows)); }).catch(() => {});
    return () => { alive = false; };
  }, [projectId]);
  return memory;
}

export type BreakdownState = ReturnType<typeof useBreakdown>;
