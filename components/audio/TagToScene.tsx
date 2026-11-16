'use client';

import React, { useState } from 'react';
import { Tag } from 'lucide-react';
import { placeTrackInScene } from '@/lib/supabase/audio';
import { useToast } from '@/components/ui/Toast';

export type SceneChoice = { id: string; label: string };

/**
 * "Tag to scene" on a Find result: pick a scene and the track is saved to the project and tagged there as a temp score.
 * `initialSceneId` is the scene Find was opened for (from the Scenes timeline), so one tap places it.
 */
export function TagToScene(p: {
  projectId: string;
  userId: string | null;
  scenes: SceneChoice[];
  initialSceneId: string | null;
  track: { uri: string; name: string; artist: string };
  onPlaced?: () => void;
}) {
  const { toast } = useToast();
  const [sceneId, setSceneId] = useState<string>(p.initialSceneId && p.scenes.some((s) => s.id === p.initialSceneId) ? p.initialSceneId : '');
  const [busy, setBusy] = useState(false);
  if (!p.scenes.length) return null;
  const label = p.scenes.find((s) => s.id === sceneId)?.label;

  const place = async () => {
    if (!sceneId || busy) return;
    setBusy(true);
    try {
      const result = await placeTrackInScene({
        projectId: p.projectId, userId: p.userId, uri: p.track.uri, sceneId,
        title: `${p.track.name}${p.track.artist ? ` — ${p.track.artist}` : ''}`, description: p.track.artist || 'Spotify',
      });
      toast(result === 'already' ? `Already in ${label}` : result === 'moved' ? `Moved to ${label} (it was tagged to another scene)` : `Tagged to ${label}`, 'success');
      p.onPlaced?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not tag the track', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-3">
      <select
        aria-label={`Scene for ${p.track.name}`}
        value={sceneId}
        onChange={(e) => setSceneId(e.target.value)}
        className="mc-text text-xs flex-1 min-w-0 rounded-lg px-2 py-1.5 min-h-[44px] bg-[var(--bg-2)] text-[var(--fg)] border border-[rgba(var(--ink-rgb),0.1)]"
      >
        <option value="">Tag to a scene…</option>
        {p.scenes.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <button
        type="button"
        disabled={!sceneId || busy}
        onClick={() => void place()}
        className="mc-text text-xs inline-flex items-center gap-1 rounded-lg px-3 py-1.5 min-h-[44px] border border-[rgba(var(--ink-rgb),0.12)] text-[var(--fg-strong)] hover:bg-[rgba(var(--ink-rgb),0.08)] disabled:opacity-40"
      >
        <Tag size={12} /> {busy ? 'Tagging…' : 'Tag'}
      </button>
    </div>
  );
}
