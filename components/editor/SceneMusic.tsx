'use client';

import { Music, Play } from 'lucide-react';

export interface SceneMusicProps {
  sceneId: string | null;
  refs: Array<{ id: string; title?: string | null; name?: string; for_scene?: string | null; role?: string | null; tags?: string[] | null }>;
  play: (ref: SceneMusicProps['refs'][number]) => void;
  /** Open the Sound section, where tracks are found, saved and tagged. */
  openSound: () => void;
}

const ROLE_LABEL: Record<string, string> = { theme: 'Theme', source: 'Source music', temp: 'Temp score', needle_drop: 'Needle drop', ambience: 'Ambience' };

/** The scene card's music: the tracks tagged to the scene in view, one tap to play. Finding and tagging lives in Sound. */
export function SceneMusic({ sceneId, refs, play, openSound }: SceneMusicProps) {
  const mine = sceneId ? refs.filter((r) => r.for_scene === sceneId) : [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-label="Music for this scene" role="group">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--fg-strong)' }}><Music size={14} /> Music</div>
      {mine.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-dim)' }}>No music tagged to this scene.</p>
      ) : mine.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" aria-label={`Play ${r.title || r.name || 'track'}`} onClick={() => play(r)}
            style={{ flexShrink: 0, width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb), 0.14)', background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Play size={16} /></button>
          <div style={{ minWidth: 0, fontSize: 12 }}>
            <div style={{ color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title || r.name || 'Track'}</div>
            <div style={{ color: 'var(--fg-muted)' }}>{[r.role ? ROLE_LABEL[r.role] ?? r.role : '', ...(r.tags ?? [])].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
      ))}
      <button type="button" onClick={openSound} style={{ alignSelf: 'flex-start', minHeight: 44, padding: '0 14px', borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.14)', background: 'transparent', color: 'var(--fg)', fontSize: 13, cursor: 'pointer' }}>
        {mine.length === 0 ? 'Find music in Sound' : 'Manage in Sound'}
      </button>
    </div>
  );
}
