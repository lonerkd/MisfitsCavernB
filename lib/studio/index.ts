'use client';

// The app's Studio data layer: lib/studio/api.ts bound to the browser client,
// plus live hooks. Import from '@/lib/studio' in UI code.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { createStudioApi, type Media, type SceneMedia, type SceneRow, type CharacterMedia } from './api';
import { useLiveRows } from './live';
import type { ParsedSceneInput } from './scene-sync';

export * from './api';
export * from './media-kind';
export { useLiveRows } from './live';
export type { LiveRows, LiveStatus } from './live';

export const studio = createStudioApi(supabase);

// ── Media library ──────────────────────────────────────────────────────────

export function useProjectMedia(projectId: string | null) {
  return useLiveRows<Media>({
    scope: projectId,
    table: 'media',
    filter: `project_id=eq.${projectId}`,
    load: () => studio.listMedia(projectId!),
    keyOf: (m) => String(m.id),
    sort: (a, b) => b.created_at.localeCompare(a.created_at),
  });
}

export const sceneMediaKey = (l: Partial<SceneMedia>) => `${l.scene_id}:${l.media_id}`;

export function useSceneMedia(projectId: string | null) {
  return useLiveRows<SceneMedia>({
    scope: projectId,
    table: 'scene_media',
    filter: `project_id=eq.${projectId}`,
    load: () => studio.listSceneMedia(projectId!),
    keyOf: sceneMediaKey,
    sort: (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  });
}

export const characterMediaKey = (l: Partial<CharacterMedia>) => `${l.character_id}:${l.media_id}`;

export function useCharacterMedia(projectId: string | null) {
  return useLiveRows<CharacterMedia>({
    scope: projectId,
    table: 'character_media',
    filter: `project_id=eq.${projectId}`,
    load: () => studio.listCharacterMedia(projectId!),
    keyOf: characterMediaKey,
    sort: (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  });
}

// ── Scene index ────────────────────────────────────────────────────────────

/** Active scenes of one script, live. */
export function useScriptScenes(scriptId: string | null) {
  return useLiveRows<SceneRow>({
    scope: scriptId,
    table: 'scenes',
    filter: `script_id=eq.${scriptId}`,
    load: () => studio.listScenes(scriptId!),
    keyOf: (s) => String(s.id),
    exclude: (s) => !!s.removed_at,
    sort: (a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0),
  });
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

/**
 * Keeps a script's scene index in step with `scenes` (parsed from its text),
 * debounced. Returns the sync state so the UI can say what's happening.
 */
export function useSceneIndexSync(scriptId: string | null, scenes: ParsedSceneInput[] | null, delayMs = 1500) {
  const [state, setState] = useState<SyncState>('idle');
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);
  const signature = useMemo(() => (scenes ? JSON.stringify(scenes.map((s) => [s.heading, s.location, s.timeOfDay, s.characters, s.eighths, s.elements])) : null), [scenes]);
  const latest = useRef(scenes);
  latest.current = scenes;

  const syncNow = useCallback(async () => {
    if (!scriptId || !latest.current) return;
    const mine = ++run.current;
    setState('syncing');
    try {
      await studio.syncScriptScenes(scriptId, latest.current);
      if (mine === run.current) { setState('synced'); setError(null); }
    } catch (e) {
      if (mine === run.current) { setState('error'); setError(e instanceof Error ? e.message : 'Could not sync scenes'); }
    }
  }, [scriptId]);

  useEffect(() => {
    if (!scriptId || signature === null) return;
    const t = setTimeout(() => { void syncNow(); }, delayMs);
    return () => clearTimeout(t);
  }, [scriptId, signature, delayMs, syncNow]);

  return { state, error, syncNow };
}

// ── Private files ──────────────────────────────────────────────────────────

const URL_TTL_SECONDS = 3600;
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const urlCache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<void>>();

async function ensureSigned(paths: string[]) {
  const now = Date.now();
  const need = paths.filter((p) => {
    const hit = urlCache.get(p);
    return (!hit || hit.expires - now < REFRESH_MARGIN_MS) && !inflight.has(p);
  });
  if (need.length) {
    const job = studio.signedUrls(need, URL_TTL_SECONDS).then((urls) => {
      const expires = Date.now() + URL_TTL_SECONDS * 1000;
      for (const [p, url] of Object.entries(urls)) urlCache.set(p, { url, expires });
    }).finally(() => need.forEach((p) => inflight.delete(p)));
    need.forEach((p) => inflight.set(p, job));
  }
  await Promise.all(paths.map((p) => inflight.get(p)).filter(Boolean));
}

/**
 * Signed URLs for private files, cached and renewed before they expire.
 * Returns a map of storage path → URL (missing until loaded).
 */
export function useSignedUrls(paths: Array<string | null | undefined>): Record<string, string> {
  const key = useMemo(() => Array.from(new Set(paths.filter(Boolean) as string[])).sort().join('\n'), [paths]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const list = key ? key.split('\n') : [];
    let cancelled = false;
    const refresh = () => {
      ensureSigned(list)
        .then(() => {
          if (cancelled) return;
          const out: Record<string, string> = {};
          for (const p of list) { const hit = urlCache.get(p); if (hit) out[p] = hit.url; }
          setUrls(out);
        })
        .catch(() => { /* thumbnails fall back to their placeholder */ });
    };
    refresh();
    const timer = setInterval(refresh, REFRESH_MARGIN_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [key]);

  return urls;
}

/** The URL to display a media item at: signed for files, the link otherwise. */
export function mediaSrc(m: Pick<Media, 'storage_path' | 'external_url'>, signed: Record<string, string>): string | null {
  if (m.storage_path) return signed[m.storage_path] ?? null;
  return m.external_url;
}

// ── Scripts in a project ───────────────────────────────────────────────────
// Not a Realtime table on purpose (a script row carries the whole screenplay);
// reloaded on focus instead.

export interface ProjectScript { id: string; title: string; updated_at: string | null }

export function useProjectScripts(projectId: string | null) {
  const [scripts, setScripts] = useState<ProjectScript[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const reload = useCallback(async () => {
    if (!projectId) { setScripts([]); setStatus('ready'); return; }
    const { data, error } = await supabase
      .from('scripts')
      .select('id, title, updated_at')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });
    if (error) { setStatus('error'); return; }
    setScripts(data);
    setStatus('ready');
  }, [projectId]);

  useEffect(() => {
    setStatus('loading');
    void reload();
    const onVisible = () => { if (document.visibilityState === 'visible') void reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  return { scripts, status, reload };
}

/** A script's current text from the server, for syncing its scene index outside the editor. */
export async function fetchScriptContent(scriptId: string): Promise<string> {
  const { data, error } = await supabase.from('scripts').select('content').eq('id', scriptId).single();
  if (error) throw new Error(error.message);
  return data.content ?? '';
}
