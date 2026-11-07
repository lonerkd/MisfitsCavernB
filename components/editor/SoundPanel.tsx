'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookmarkPlus, Mic2, Music, Pause, Play, Square } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { sceneMood } from '@/lib/spotify/moods';
import { searchSpotify } from '@/lib/spotify/search';
import { addAudioRef, listAudioRefs } from '@/lib/supabase/audio';

interface Track { id: string; uri: string; name: string; artist: string }

export interface SoundPanelProps {
  /** The table read (browser voices): the page owns its engine; this panel is its remote control. */
  tableRead: { supported: boolean; playing: boolean; lineIdx: number | null; totalLines: number; sceneStartLine: number | null; start: (fromLine: number) => void; pause: () => void; resume: () => void; stop: () => void };
  sceneLabel: string | null;
  /** The current scene's action and dialogue (no heading) and its time of day, which give it its mood. */
  sceneBody: string;
  timeOfDay: string;
  projectId: string | null;
  userId: string | null;
  refs: Array<{ id: string; title?: string | null; name?: string; uri?: string; reference_type?: string | null }>;
  onRefsChanged: (refs: Array<Record<string, unknown>>) => void;
  playRef: (ref: SoundPanelProps['refs'][number]) => void;
}

const heading = (icon: React.ReactNode, text: string) => (
  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-strong)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>{icon} {text}</div>
);
const round = { flexShrink: 0, width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as const;
const ghost = { minHeight: 44, padding: '0 14px', borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.14)', background: 'transparent', color: 'var(--fg)', fontSize: 13, cursor: 'pointer' } as const;

/**
 * The sound desk in ScriptOS: everything about how this script sounds, in one place. The table read (the browser reads the script
 * in a voice per character), the music for the scene in view (its mood, suggestions, save to the project, what is playing now),
 * and the project's saved tracks. The table read used to be a floating control in the writing area; it lives here now.
 */
export function SoundPanel(p: SoundPanelProps) {
  const { toast } = useToast();
  const spotify = useSpotify();
  const mood = sceneMood(p.sceneBody, p.timeOfDay);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState('');

  const { isAuthenticated } = spotify;
  const query = mood.query;
  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    const timer = setTimeout(() => {
      searchSpotify(query, 'track')
        .then((items: Array<{ id: string; uri: string; name: string; artists?: Array<{ name: string }> }>) => { if (alive) { setTracks(items.map((t) => ({ id: t.id, uri: t.uri, name: t.name, artist: t.artists?.[0]?.name ?? '' }))); setError(''); } })
        .catch((e: unknown) => { if (alive) { setTracks([]); setError(e instanceof Error ? e.message : 'Could not search Spotify'); } });
    }, 400);
    return () => { alive = false; clearTimeout(timer); };
  }, [isAuthenticated, query]);

  const save = async (t: Track) => {
    if (!p.projectId) { toast('Open this script from a project to save tracks to it', 'info'); return; }
    try {
      await addAudioRef({ projectId: p.projectId, userId: p.userId, type: 'spotify', uri: t.uri, title: `${t.name} — ${t.artist}`, description: `${mood.mood}${p.sceneLabel ? ` · ${p.sceneLabel}` : ''}` });
      p.onRefsChanged(await listAudioRefs(p.projectId));
      toast('Saved to the project', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not save the track', 'error'); }
  };

  const tr = p.tableRead;
  const reading = tr.lineIdx != null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <section aria-label="Table read">
        {heading(<Mic2 size={14} />, 'Table read')}
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.4 }}>
          {!tr.supported ? 'This browser cannot read aloud.' : reading ? `Reading line ${(tr.lineIdx ?? 0) + 1} of ${tr.totalLines}.` : 'The browser reads the script aloud, a voice per character, and times each scene.'}
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" aria-label={tr.playing ? 'Pause table read' : 'Play table read'} disabled={!tr.supported} style={round}
            onClick={() => (tr.playing ? tr.pause() : reading ? tr.resume() : tr.start(0))}>{tr.playing ? <Pause size={18} /> : <Play size={18} />}</button>
          {reading && <button type="button" aria-label="Stop table read" style={{ ...round, background: 'transparent', color: 'var(--fg)', border: '1px solid rgba(var(--ink-rgb), 0.2)' }} onClick={tr.stop}><Square size={16} /></button>}
          {tr.sceneStartLine != null && <button type="button" style={ghost} disabled={!tr.supported} onClick={() => tr.start(tr.sceneStartLine!)}>From this scene</button>}
        </div>
      </section>

      <section aria-label="Music for this scene">
        {heading(<Music size={14} />, 'Music for this scene')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, color: 'var(--fg-muted)' }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: mood.color }} />
          <span>{p.sceneLabel ?? 'No scene yet'} reads as <strong style={{ color: 'var(--fg)' }}>{mood.mood}</strong></span>
        </div>
        {spotify.currentTrack && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.08)', marginBottom: 8 }}>
            <button type="button" aria-label={spotify.isPlaying ? 'Pause music' : 'Play music'} style={round} onClick={spotify.togglePlay}>{spotify.isPlaying ? <Pause size={18} /> : <Play size={18} />}</button>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spotify.currentTrack.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spotify.currentTrack.artists?.map((a) => a.name).join(', ')}</div>
            </div>
          </div>
        )}
        {!isAuthenticated ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-muted)' }}>Connect Spotify to get music for each scene. <Link href="/soundtrack" style={{ color: 'var(--accent)' }}>Connect in Soundtrack</Link></p>
        ) : tracks === null ? <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-muted)' }}>Looking for {mood.mood.toLowerCase()} music…</p>
          : error ? <p role="alert" style={{ margin: 0, fontSize: 12, color: 'var(--danger)' }}>{error}</p>
          : tracks.length === 0 ? <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-muted)' }}>Nothing found for this mood.</p>
          : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tracks.map((t) => (
                <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" aria-label={`Play ${t.name}`} style={{ ...round, width: 44, height: 44 }} onClick={() => { void spotify.playUri(t.uri); }}><Play size={16} /></button>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.artist}</div>
                  </div>
                  <button type="button" aria-label={`Save ${t.name} to the project`} style={{ ...ghost, minWidth: 44, padding: 0 }} onClick={() => void save(t)}><BookmarkPlus size={16} /></button>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section aria-label="Saved tracks">
        {heading(<Music size={14} />, 'Saved to this project')}
        {p.refs.length === 0 ? <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-dim)', fontStyle: 'italic' }}>Nothing saved yet. Save a suggestion above, or link tracks from Soundtrack.</p> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {p.refs.map((ref) => (
              <li key={ref.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" aria-label={`Play ${ref.title || ref.name || 'track'}`} style={round} onClick={() => p.playRef(ref)}><Play size={16} /></button>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ref.title || ref.name || ref.uri || 'Untitled track'}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{ref.reference_type === 'spotify' ? 'Spotify' : ref.reference_type === 'custom_upload' ? 'Upload' : ref.reference_type || 'audio'}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
