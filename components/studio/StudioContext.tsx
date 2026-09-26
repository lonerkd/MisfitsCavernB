'use client';

// One provider for the Studio page: the active project's library, scene index
// and links, loaded once and kept live, shared by every tab. Replaces the old
// 90-field untyped context.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Project } from '@/lib/os';
import { parseScript } from '@/lib/scriptos/parser';
import {
  fetchScriptContent,
  studio,
  useProjectMedia,
  useProjectScripts,
  useSceneMedia,
  useScriptScenes,
  type LiveRows,
  type Media,
  type ProjectScript,
  type SceneMedia,
  type SceneRow,
  type SyncState,
} from '@/lib/studio';

export interface StudioData {
  project: Project;
  userId: string;
  isOwner: boolean;
  media: LiveRows<Media>;
  links: LiveRows<SceneMedia>;
  scripts: ProjectScript[];
  scriptsStatus: 'loading' | 'ready' | 'error';
  scriptId: string | null;
  setScriptId: (id: string) => void;
  scenes: LiveRows<SceneRow>;
  sceneSync: { state: SyncState; error: string | null; run: () => Promise<void> };
  /** media id → linked scene ids, and scene id → linked media ids, from `links`. */
  scenesByMedia: Map<string, string[]>;
  mediaByScene: Map<string, string[]>;
  mediaById: Map<string, Media>;
}

const Ctx = createContext<StudioData | null>(null);

export function useStudio(): StudioData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStudio must be used inside <StudioProvider>');
  return v;
}

const scriptPrefKey = (projectId: string) => `mc_studio_script_${projectId}`;

export function StudioProvider({ project, userId, children }: { project: Project; userId: string; children: React.ReactNode }) {
  const projectId = project.id;
  const media = useProjectMedia(projectId);
  const links = useSceneMedia(projectId);
  const { scripts, status: scriptsStatus } = useProjectScripts(projectId);

  // Which script's scenes the Studio shows: the last one chosen on this device,
  // else the most recently edited. (A per-device UI preference.)
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => {
    try { setChosen(localStorage.getItem(scriptPrefKey(projectId))); } catch { setChosen(null); }
  }, [projectId]);
  const scriptId = useMemo(() => {
    if (chosen && scripts.some((sc) => sc.id === chosen)) return chosen;
    return scripts[0]?.id ?? null;
  }, [chosen, scripts]);
  const setScriptId = useCallback((id: string) => {
    setChosen(id);
    try { localStorage.setItem(scriptPrefKey(projectId), id); } catch { /* private mode */ }
  }, [projectId]);

  const scenes = useScriptScenes(scriptId);

  // Bring the scene index up to date with the script's saved text whenever a
  // script is opened here — the editor syncs as you write, this covers edits
  // made elsewhere or before this feature existed.
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const run = useCallback(async () => {
    if (!scriptId) return;
    setSyncState('syncing');
    try {
      const text = await fetchScriptContent(scriptId);
      await studio.syncScriptScenes(scriptId, parseScript(text).scenes);
      await scenes.reload();
      setSyncState('synced');
      setSyncError(null);
    } catch (e) {
      setSyncState('error');
      setSyncError(e instanceof Error ? e.message : 'Could not read the script');
    }
    // scenes.reload is stable per scriptId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptId]);
  useEffect(() => { void run(); }, [run]);

  const { scenesByMedia, mediaByScene } = useMemo(() => {
    const byMedia = new Map<string, string[]>();
    const byScene = new Map<string, string[]>();
    for (const l of links.rows) {
      byMedia.set(l.media_id, [...(byMedia.get(l.media_id) ?? []), l.scene_id]);
      byScene.set(l.scene_id, [...(byScene.get(l.scene_id) ?? []), l.media_id]);
    }
    return { scenesByMedia: byMedia, mediaByScene: byScene };
  }, [links.rows]);
  const mediaById = useMemo(() => new Map(media.rows.map((m) => [m.id, m])), [media.rows]);

  const value: StudioData = {
    project,
    userId,
    isOwner: project.creator_id === userId,
    media,
    links,
    scripts,
    scriptsStatus,
    scriptId,
    setScriptId,
    scenes,
    sceneSync: { state: syncState, error: syncError, run },
    scenesByMedia,
    mediaByScene,
    mediaById,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
