'use client';

// Breakdown mode for the editor: the project's live breakdown, what to
// highlight on each line, suggestions per scene, and the actions (tag the
// selection, accept, dismiss, untag). Only project scripts have a breakdown —
// scenes must be in the scene index to be tagged.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { breakdown, useBreakdown, useBreakdownMemory, nameKey, type Suggestion } from '@/lib/breakdown';
import { buildBreakdownView, sceneRanges, type EditorLine, type Mark } from '@/lib/breakdown/marks';
import { announceProgressChange } from '@/lib/supabase/progress';

const MODE_KEY = 'mc_breakdown_mode';

export interface CaretContext {
  line: number;
  /** Selected text on one line (trimmed), if any. */
  selection: string | null;
  /** The mark under the caret, if any. */
  mark: Mark | null;
  sceneIdx: number;
}

export function useEditorBreakdown(opts: {
  projectId: string | null;
  lines: EditorLine[];
  sceneIds: Array<string | null>;
  characters: string[][];
  onError: (message: string) => void;
  onDone?: (message: string) => void;
}) {
  const { projectId, lines, sceneIds, characters, onError, onDone } = opts;
  const state = useBreakdown(projectId);
  const memory = useBreakdownMemory(projectId);

  // A writing preference, per device.
  const [mode, setModeState] = useState(false);
  useEffect(() => { try { setModeState(localStorage.getItem(MODE_KEY) === 'on'); } catch { /* blocked */ } }, []);
  const setMode = useCallback((on: boolean) => {
    setModeState(on);
    try { localStorage.setItem(MODE_KEY, on ? 'on' : 'off'); } catch { /* blocked */ }
  }, []);

  const ranges = useMemo(() => sceneRanges(lines, sceneIds, characters), [lines, sceneIds, characters]);
  const view = useMemo(() => {
    if (!projectId) return { marks: new Map<number, Mark[]>(), suggestions: new Map<number, Suggestion[]>() };
    return buildBreakdownView({
      lines, ranges,
      tags: state.tags.rows, elements: state.elements.rows, categories: state.categories.rows, dismissed: state.dismissed, memory,
    });
  }, [projectId, lines, ranges, state.tags.rows, state.elements.rows, state.categories.rows, state.dismissed, memory]);

  const sceneIdxAtLine = useCallback((line: number) => {
    for (let n = ranges.length - 1; n >= 0; n--) if (ranges[n].start <= line) return n;
    return -1;
  }, [ranges]);

  const caretContext = useCallback((value: string, selStart: number, selEnd: number): CaretContext => {
    const before = value.slice(0, selStart);
    const line = before.split('\n').length - 1;
    const col = selStart - (before.lastIndexOf('\n') + 1);
    const selected = value.slice(selStart, selEnd);
    const selection = selEnd > selStart && !selected.includes('\n') && selected.trim().length <= 120 ? selected.trim() || null : null;
    const mark = (view.marks.get(line) ?? []).find((m) => col >= m.start && col <= m.end) ?? null;
    return { line, selection, mark, sceneIdx: sceneIdxAtLine(line) };
  }, [view.marks, sceneIdxAtLine]);

  const changed = useCallback(() => { if (projectId) announceProgressChange(projectId); }, [projectId]);

  const tagText = useCallback(async (sceneIdx: number, name: string, categoryId: string) => {
    const sceneId = ranges[sceneIdx]?.sceneId;
    const clean = name.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    if (!sceneId) { onError('This scene is still being saved — try again in a moment.'); return; }
    try {
      const elementId = await breakdown.tag(sceneId, clean, categoryId);
      // Show it now; Realtime confirms it.
      if (!state.elements.rows.some((e) => e.id === elementId)) await state.elements.reload();
      state.tags.upsertLocal({ scene_id: sceneId, element_id: elementId, project_id: projectId!, created_by: null, created_at: new Date().toISOString() });
      const label = state.categoryById.get(categoryId)?.label ?? 'the breakdown';
      onDone?.(`Tagged “${clean}” — ${label}`);
      changed();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not tag that');
    }
  }, [ranges, projectId, state.elements, state.tags, state.categoryById, onError, onDone, changed]);

  const accept = useCallback((sceneIdx: number, s: Suggestion, categoryId = s.categoryId) => tagText(sceneIdx, s.name, categoryId), [tagText]);

  const dismiss = useCallback(async (name: string) => {
    if (!projectId) return;
    try {
      const row = await breakdown.dismiss(projectId, name);
      state.dismissals.upsertLocal(row);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not dismiss that');
    }
  }, [projectId, state.dismissals, onError]);

  const untag = useCallback(async (sceneIdx: number, elementId: string) => {
    const sceneId = ranges[sceneIdx]?.sceneId;
    if (!sceneId) return;
    try {
      await breakdown.untag(sceneId, elementId);
      state.tags.removeLocal(`${sceneId}:${elementId}`);
      changed();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not remove the tag');
    }
  }, [ranges, state.tags, onError, changed]);

  const isDismissed = useCallback((name: string) => state.dismissed.has(nameKey(name)), [state.dismissed]);

  return { enabled: !!projectId, state, view, ranges, mode, setMode, caretContext, tagText, accept, dismiss, untag, isDismissed, sceneIdxAtLine };
}

export type EditorBreakdown = ReturnType<typeof useEditorBreakdown>;
