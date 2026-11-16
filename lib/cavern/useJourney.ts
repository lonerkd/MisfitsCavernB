'use client';

// Loads the active project's scenes for the cavern's journey: the first script's scenes and text, read the way the Scenes timeline reads
// them. No project, or a project with no scenes, is a status and not an error: the cave simply keeps following the player.
import { useEffect, useState } from 'react';
import { useProject } from '@/lib/os/hooks';
import { listProjectScripts, loadScriptForTimeline } from '@/lib/supabase/audio';
import { journeyFromScenes, type Journey, type JourneyStatus } from './journey';

export interface JourneyState { journey: Journey | null; status: JourneyStatus }

export function useJourney(): JourneyState {
  const { activeProject } = useProject();
  const projectId = activeProject?.id ?? null;
  const [loaded, setLoaded] = useState<{ projectId: string; journey: Journey | null; failed: boolean } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let on = true;
    (async () => {
      try {
        const scripts = await listProjectScripts(projectId);
        const id = scripts[0]?.id;
        const script = id ? await loadScriptForTimeline(id) : { content: null, scenes: [] };
        if (on) setLoaded({ projectId, journey: journeyFromScenes(script.scenes, script.content), failed: false });
      } catch {
        if (on) setLoaded({ projectId, journey: null, failed: true });
      }
    })();
    return () => { on = false; };
  }, [projectId]);

  if (!projectId) return { journey: null, status: 'no-project' };
  if (!loaded || loaded.projectId !== projectId) return { journey: null, status: 'loading' };
  if (loaded.failed) return { journey: null, status: 'failed' };
  return loaded.journey ? { journey: loaded.journey, status: 'ready' } : { journey: null, status: 'no-scenes' };
}
