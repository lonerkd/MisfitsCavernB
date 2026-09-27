'use client';

import { useCallback, useMemo } from 'react';
import { studio, type LineCutNote } from '@/lib/studio';
import { useLiveRows } from '@/lib/studio/live';

/**
 * A project's cut notes pinned to script lines (Studio › Post), live. Realtime
 * rows don't carry the cut's name, so it's kept from the last load.
 */
export function useLineCutNotes(projectId: string | null) {
  const live = useLiveRows<LineCutNote>({
    scope: projectId,
    table: 'post_notes',
    filter: `project_id=eq.${projectId}`,
    load: () => studio.listLineCutNotes(projectId!),
    keyOf: (n) => String(n.id),
    exclude: (n) => n.line_offset == null,
    sort: (a, b) => Number(a.at_seconds) - Number(b.at_seconds),
  });
  const titles = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of live.rows) if (n.cut_title) m.set(n.cut_id, n.cut_title);
    return m;
  }, [live.rows]);
  const notes = useMemo(() => live.rows.map((n) => (n.cut_title ? n : { ...n, cut_title: titles.get(n.cut_id) ?? 'Cut' })), [live.rows, titles]);

  const { upsertLocal } = live;
  const setResolved = useCallback(async (note: LineCutNote, userId: string, resolved: boolean) => {
    const row = await studio.setPostNoteResolved(note.id, userId, resolved);
    upsertLocal({ ...row, cut_title: note.cut_title });
  }, [upsertLocal]);

  return { notes, status: live.status, setResolved };
}
