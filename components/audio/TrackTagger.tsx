'use client';

import { useState } from 'react';
import { AUDIO_ROLES, normalizeTags, type AudioRole } from '@/lib/supabase/audio';

const ghost = { minHeight: 44, padding: '0 14px', borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.14)', background: 'transparent', color: 'var(--fg)', fontSize: 13, cursor: 'pointer' } as const;
const field = { minHeight: 44, borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.14)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 10px', fontSize: 14 } as const;

export interface TaggerTrack { role?: string | null; for_scene?: string | null; tags?: string[] | null }
export interface TaggerScene { id: string; label: string }

/**
 * Tag a saved track: its role, free tags and the scene it is for. Used by the editor's Sound tab (which knows the scene in view,
 * so it offers "For this scene") and by the Sound page's Library (which lists the project's scenes to choose from).
 */
export function TrackTagger({ track, sceneId, scenes, onSave, onClose }: {
  track: TaggerTrack;
  /** The scene in view, when there is one: shows a "For this scene" checkbox. */
  sceneId?: string | null;
  /** The project's scenes, to choose from: shows a scene picker instead. */
  scenes?: TaggerScene[];
  onSave: (t: { sceneId: string | null; role: AudioRole | null; tags: string[] }) => Promise<void>;
  onClose: () => void;
}) {
  const [role, setRole] = useState<AudioRole | ''>((track.role as AudioRole | null) ?? '');
  const [forThis, setForThis] = useState(!!sceneId && track.for_scene === sceneId);
  const [picked, setPicked] = useState(track.for_scene ?? '');
  const [tags, setTags] = useState((track.tags ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const scene = scenes ? picked || null : forThis ? sceneId ?? null : null;
  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 8, padding: 10, borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.1)' }}>
      <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>Role in the scene
        <select value={role} onChange={(e) => setRole(e.target.value as AudioRole | '')} style={field}>
          <option value="">No role</option>
          {(Object.entries(AUDIO_ROLES) as Array<[AudioRole, string]>).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>Tags (comma separated)
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tense, strings, radio" style={field} />
      </label>
      {scenes ? (
        <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>Scene
          <select value={picked} onChange={(e) => setPicked(e.target.value)} style={field}>
            <option value="">No scene</option>
            {scenes.map((sc) => <option key={sc.id} value={sc.id}>{sc.label}</option>)}
          </select>
        </label>
      ) : sceneId ? (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={forThis} onChange={(e) => setForThis(e.target.checked)} /> For this scene
        </label>
      ) : null}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={ghost} onClick={onClose}>Cancel</button>
        <button type="button" disabled={busy} style={{ ...ghost, background: 'var(--accent)', color: 'var(--on-accent)', border: 'none' }}
          onClick={() => { setBusy(true); void onSave({ sceneId: scene, role: role || null, tags: normalizeTags(tags) }).then(onClose, () => { /* the caller already said why */ }).finally(() => setBusy(false)); }}>{busy ? 'Saving…' : 'Save tags'}</button>
      </div>
    </div>
  );
}
