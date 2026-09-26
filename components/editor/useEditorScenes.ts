'use client';

// The editor's view of the scene index: which stored scene each heading on the
// page is, kept in sync as the writer works, plus per-scene notes and colours.
//
// Scripts inside a project use public.scenes (shared with the crew, visible in
// the Studio). A personal script has no scene index, so its notes/colours stay
// on this device — and move into the index automatically once the script
// joins a project.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { alignSceneIds, normalizeHeading, type ParsedSceneInput } from '@/lib/studio/scene-sync';
import { studio, useSceneIndexSync, useScriptScenes, type SceneRow } from '@/lib/studio';

const notesKey = (scriptId: string) => `mc_scene_notes_${scriptId}`;
const colorsKey = (scriptId: string) => `mc_scene_colors_${scriptId}`;

function readLocal(key: string): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; }
}
function writeLocal(key: string, value: Record<string, string>) {
  try {
    if (Object.keys(value).length) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch { /* storage full or blocked */ }
}

export function useEditorScenes(
  script: { id: string; project_id?: string | null } | null,
  parsed: ParsedSceneInput[],
  onError: (message: string) => void,
) {
  const scriptId = script?.id ?? null;
  const indexedId = script?.project_id ? script.id : null;
  const scenes = useScriptScenes(indexedId);
  const sync = useSceneIndexSync(indexedId, indexedId ? parsed : null, 2500);

  // Stored scene for each heading on the page (null = new, not synced yet).
  const rows = useMemo<Array<SceneRow | null>>(() => {
    if (!indexedId) return parsed.map(() => null);
    const ids = alignSceneIds(scenes.rows, parsed, () => '');
    const byId = new Map(scenes.rows.map((r) => [r.id, r]));
    return ids.map((id) => (id ? byId.get(id) ?? null : null));
  }, [indexedId, scenes.rows, parsed]);

  // Device-only notes/colours for personal scripts (keyed by heading).
  const [local, setLocal] = useState<{ notes: Record<string, string>; colors: Record<string, string> }>({ notes: {}, colors: {} });
  useEffect(() => {
    if (!scriptId) { setLocal({ notes: {}, colors: {} }); return; }
    setLocal({ notes: readLocal(notesKey(scriptId)), colors: readLocal(colorsKey(scriptId)) });
  }, [scriptId]);
  const keyAt = useCallback((i: number) => normalizeHeading(parsed[i]?.heading), [parsed]);

  const notes = parsed.map((_, i) => (indexedId ? rows[i]?.note ?? '' : local.notes[keyAt(i)] ?? ''));
  const colors = parsed.map((_, i) => (indexedId ? rows[i]?.color ?? null : local.colors[keyAt(i)] ?? null));

  const update = useCallback(async (i: number, patch: Partial<Pick<SceneRow, 'note' | 'color'>>) => {
    const row = rows[i];
    if (!row) { onError('This scene is still being saved — try again in a moment.'); return; }
    scenes.upsertLocal({ ...row, ...patch });
    try {
      scenes.upsertLocal(await studio.updateScene(row.id, patch));
    } catch (e) {
      scenes.upsertLocal(row);
      onError(e instanceof Error ? e.message : 'Could not save the scene');
    }
  }, [rows, scenes, onError]);

  const setNote = useCallback((i: number, note: string) => {
    const value = note.trim();
    if (indexedId) {
      if ((rows[i]?.note ?? '') === value) return;
      void update(i, { note: value || null });
      return;
    }
    if (!scriptId) return;
    setLocal((prev) => {
      const next = { ...prev.notes };
      if (value) next[keyAt(i)] = value; else delete next[keyAt(i)];
      writeLocal(notesKey(scriptId), next);
      return { ...prev, notes: next };
    });
  }, [indexedId, scriptId, rows, update, keyAt]);

  /** Toggle a colour tag: the same colour again clears it. */
  const tag = useCallback((i: number, color: string) => {
    if (indexedId) {
      void update(i, { color: rows[i]?.color === color ? null : color });
      return;
    }
    if (!scriptId) return;
    setLocal((prev) => {
      const next = { ...prev.colors };
      if (next[keyAt(i)] === color) delete next[keyAt(i)]; else next[keyAt(i)] = color;
      writeLocal(colorsKey(scriptId), next);
      return { ...prev, colors: next };
    });
  }, [indexedId, scriptId, rows, update, keyAt]);

  // Once per script: move notes/colours saved on this device into the shared
  // scene index, then forget the device copy — only after every write lands.
  const migrated = useRef<string | null>(null);
  useEffect(() => {
    if (!indexedId || migrated.current === indexedId || scenes.status !== 'ready' || sync.state !== 'synced') return;
    const oldNotes = readLocal(notesKey(indexedId));
    const oldColors = readLocal(colorsKey(indexedId));
    migrated.current = indexedId;
    if (!Object.keys(oldNotes).length && !Object.keys(oldColors).length) return;
    const claimed = new Set<string>();
    const writes: Array<Promise<unknown>> = [];
    parsed.forEach((sc, i) => {
      const key = normalizeHeading(sc.heading);
      const row = rows[i];
      if (!row || claimed.has(key)) return;
      claimed.add(key);
      const patch: Partial<Pick<SceneRow, 'note' | 'color'>> = {};
      if (oldNotes[key] && !row.note) patch.note = oldNotes[key];
      if (oldColors[key] && !row.color) patch.color = oldColors[key];
      if (Object.keys(patch).length) writes.push(studio.updateScene(row.id, patch).then((r) => scenes.upsertLocal(r)));
    });
    Promise.all(writes)
      .then(() => { writeLocal(notesKey(indexedId), {}); writeLocal(colorsKey(indexedId), {}); })
      .catch(() => { migrated.current = null; });
  }, [indexedId, scenes.status, sync.state, parsed, rows, scenes]);

  return { indexed: !!indexedId, rows, notes, colors, setNote, tag, sync, scenes };
}
