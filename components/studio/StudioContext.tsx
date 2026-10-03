'use client';

// One provider for the Studio page: the active project's library, scene index
// and links, loaded once and kept live, shared by every tab. Replaces the old
// 90-field untyped context.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/lib/os';
import { postToSplit, useSplitMessages } from '@/lib/split/pane';
import { parseScript } from '@/lib/scriptos/parser';
import { announceProgressChange } from '@/lib/supabase/progress';
import type { ProductionView, StudioTab } from '@/lib/os/progress';
import { useDeviceValue, writeDeviceValue } from '@/lib/hooks/useDeviceValue';
import {
  fetchScriptContent,
  studio,
  useProjectMedia,
  useProjectScripts,
  useProjectShots,
  usePostCuts,
  usePostNotes,
  useSceneMedia,
  useScriptScenes,
  type LiveRows,
  type Media,
  type ProjectScript,
  type SceneMedia,
  type SceneRow,
  type Shot,
  type PostCut,
  type PostNote,
  type SyncState,
} from '@/lib/studio';

export interface StudioData {
  project: Project;
  userId: string;
  isOwner: boolean;
  media: LiveRows<Media>;
  links: LiveRows<SceneMedia>;
  shots: LiveRows<Shot>;
  cuts: LiveRows<PostCut>;
  postNotes: LiveRows<PostNote>;
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
  /** In a linked split screen: the scene the script's caret is in (changes as the writer moves). */
  followScene: { sceneId: string; at: number } | null;
  /** Take the script to a scene (to a cut note's line, given the note): the other pane in a split screen, else the editor. */
  openInScript: (scene: Pick<SceneRow, 'id' | 'script_id'>, noteId?: string) => void;
  /** The open script's lines per scene id (index 0 is the heading), from its saved text. */
  sceneLines: Map<string, ScriptLineLite[]>;
  /** Open another Studio tab or view in place (an empty state's next step). */
  goTo: (tab: StudioTab, view?: ProductionView) => void;
}

export interface ScriptLineLite { type: string; text: string }

const Ctx = createContext<StudioData | null>(null);

export function useStudio(): StudioData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStudio must be used inside <StudioProvider>');
  return v;
}

const scriptPrefKey = (projectId: string) => `mc_studio_script_${projectId}`;

const noNav = () => {};

export function StudioProvider({ project, userId, onNavigate = noNav, children }: { project: Project; userId: string; onNavigate?: (tab: StudioTab, view?: ProductionView) => void; children: React.ReactNode }) {
  const projectId = project.id;
  const media = useProjectMedia(projectId);
  const links = useSceneMedia(projectId);
  const shots = useProjectShots(projectId);
  const cuts = usePostCuts(projectId);
  const postNotes = usePostNotes(projectId);
  const { scripts, status: scriptsStatus } = useProjectScripts(projectId);

  // Which script's scenes the Studio shows: the last one chosen on this device,
  // else the most recently edited. (A per-device UI preference.)
  const chosen = useDeviceValue(scriptPrefKey(projectId));
  const scriptId = useMemo(() => {
    if (chosen && scripts.some((sc) => sc.id === chosen)) return chosen;
    return scripts[0]?.id ?? null;
  }, [chosen, scripts]);
  const setScriptId = useCallback((id: string) => {
    writeDeviceValue(scriptPrefKey(projectId), id);
  }, [projectId]);

  const scenes = useScriptScenes(scriptId);

  // Bring the scene index up to date with the script's saved text whenever a
  // script is opened here — the editor syncs as you write, this covers edits
  // made elsewhere or before this feature existed.
  // The sync's outcome, tagged with the script it was for: a script without
  // one yet is syncing (it starts as soon as the script is chosen).
  const [sync, setSync] = useState<{ scriptId: string; state: SyncState; error: string | null } | null>(null);
  const syncState: SyncState = !scriptId ? 'idle' : sync?.scriptId === scriptId ? sync.state : 'syncing';
  const syncError = sync?.scriptId === scriptId ? sync.error : null;
  const [parsedScenes, setParsedScenes] = useState<{ scriptId: string; scenes: ScriptLineLite[][] } | null>(null);
  const reloadScenes = scenes.reload; // changes with the script, whose scenes it reloads
  const syncScenes = useCallback((id: string) => fetchScriptContent(id)
    .then(async (text) => {
      const parsed = parseScript(text);
      setParsedScenes({
        scriptId: id,
        scenes: parsed.scenes.map((sc) => parsed.lines.slice(sc.startIndex, sc.endIndex + 1).map((l) => ({ type: l.type, text: l.text }))),
      });
      await studio.syncScriptScenes(id, parsed.scenes);
      await reloadScenes();
      // Scenes count toward the phase milestones and open the Scenes tab.
      announceProgressChange(projectId);
      setSync({ scriptId: id, state: 'synced', error: null });
    })
    .catch((e) => setSync({ scriptId: id, state: 'error', error: e instanceof Error ? e.message : 'Could not read the script' })),
  [projectId, reloadScenes]);
  const run = useCallback(async () => {
    if (!scriptId) return;
    setSync({ scriptId, state: 'syncing', error: null });
    await syncScenes(scriptId);
  }, [scriptId, syncScenes]);
  useEffect(() => { if (scriptId) void syncScenes(scriptId); }, [scriptId, syncScenes]);

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

  // Split screen: follow the script's caret; a scene from another script switches to it.
  const [followScene, setFollowScene] = useState<StudioData['followScene']>(null);
  useSplitMessages((msg) => {
    if (msg.type !== 'scene' || !msg.sceneId) return;
    if (msg.scriptId !== scriptId && scripts.some((sc) => sc.id === msg.scriptId)) setScriptId(msg.scriptId);
    setFollowScene({ sceneId: msg.sceneId, at: Date.now() });
  });
  const router = useRouter();
  const openInScript = useCallback((scene: Pick<SceneRow, 'id' | 'script_id'>, noteId?: string) => {
    if (!scene.script_id) return;
    if (postToSplit({ type: 'open-scene', scriptId: scene.script_id, sceneId: scene.id, ...(noteId ? { noteId } : {}) })) return;
    router.push(`/editor?script=${scene.script_id}&scene=${scene.id}${noteId ? `&note=${noteId}` : ''}`);
  }, [router]);

  // The sync keeps rows in the parsed order, so a row's ordinal is its parsed scene.
  const sceneLines = useMemo(() => {
    const map = new Map<string, ScriptLineLite[]>();
    if (!parsedScenes || parsedScenes.scriptId !== scriptId) return map;
    for (const row of scenes.rows) {
      const lines = row.ordinal != null ? parsedScenes.scenes[row.ordinal] : undefined;
      if (lines) map.set(row.id, lines);
    }
    return map;
  }, [parsedScenes, scriptId, scenes.rows]);

  const value: StudioData = {
    project,
    userId,
    isOwner: project.creator_id === userId,
    media,
    links,
    shots,
    cuts,
    postNotes,
    scripts,
    scriptsStatus,
    scriptId,
    setScriptId,
    scenes,
    sceneSync: { state: syncState, error: syncError, run },
    scenesByMedia,
    mediaByScene,
    mediaById,
    followScene,
    openInScript,
    sceneLines,
    goTo: onNavigate,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
