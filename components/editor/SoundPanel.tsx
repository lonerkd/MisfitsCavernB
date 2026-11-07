'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { BookmarkPlus, Mic2, Music, Pause, Play, Square } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { SpotifyPreview } from '@/components/audio/SpotifyPreview';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { sceneMood } from '@/lib/spotify/moods';
import { searchSpotify } from '@/lib/spotify/search';
import { AUDIO_ROLES, addAudioRef, listAudioRefs, normalizeTags, tagAudioRef, type AudioRole } from '@/lib/supabase/audio';

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
  /** The current scene's own id (its row), so a track can be tagged to it; null when it is not saved yet. */
  sceneId: string | null;
  refs: Array<{ id: string; title?: string | null; name?: string; uri?: string; reference_type?: string | null; for_scene?: string | null; role?: string | null; tags?: string[] | null }>;
  onRefsChanged: (refs: Array<Record<string, unknown>>) => void;
  playRef: (ref: SoundPanelProps['refs'][number]) => void;
}

const heading = (icon: React.ReactNode, text: string) => (
  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-strong)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>{icon} {text}</div>
);
const round = { flexShrink: 0, width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as const;
const ghost = { minHeight: 44, padding: '0 14px', borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.14)', background: 'transparent', color: 'var(--fg)', fontSize: 13, cursor: 'pointer' } as const;

/** The inline editor for one saved track: which role it plays, whether it is for this scene, and its tags. */
function TrackTagger({ track, sceneId, onSave, onClose }: { track: SoundPanelProps['refs'][number]; sceneId: string | null; onSave: (t: { sceneId: string | null; role: AudioRole | null; tags: string[] }) => Promise<void>; onClose: () => void }) {
  const [role, setRole] = useState<AudioRole | ''>((track.role as AudioRole | null) ?? '');
  const [forThis, setForThis] = useState(!!sceneId && track.for_scene === sceneId);
  const [tags, setTags] = useState((track.tags ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const field = { minHeight: 44, borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.14)', background: 'var(--bg)', color: 'var(--fg)', padding: '0 10px', fontSize: 14 } as const;
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
      {sceneId && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={forThis} onChange={(e) => setForThis(e.target.checked)} /> For this scene
        </label>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={ghost} onClick={onClose}>Cancel</button>
        <button type="button" disabled={busy} style={{ ...ghost, background: 'var(--accent)', color: 'var(--on-accent)', border: 'none' }}
          onClick={() => { setBusy(true); void onSave({ sceneId: forThis ? sceneId : null, role: role || null, tags: normalizeTags(tags) }).then(onClose, () => { /* the caller already said why */ }).finally(() => setBusy(false)); }}>{busy ? 'Saving…' : 'Save tags'}</button>
      </div>
    </div>
  );
}

/**
 * The sound desk in ScriptOS: everything about how this script sounds, in one place. The table read (the browser reads the script
 * in a voice per character), the music for the scene in view (its mood, suggestions, save to the project, what is playing now),
 * and the project's saved tracks. The table read used to be a floating control in the writing area; it lives here now.
 */
const noSubscribe = () => () => {};
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function SoundPanel(p: SoundPanelProps) {
  const { toast } = useToast();
  // iOS plays speech through the ringer channel: the side switch silences the table read. Only said where it applies.
  const ios = useSyncExternalStore(noSubscribe, isIos, () => false);
  const spotify = useSpotify();
  const mood = sceneMood(p.sceneBody, p.timeOfDay);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState('');
  const [tagging, setTagging] = useState<string | null>(null);

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

  const retag = async (id: string, t: { sceneId: string | null; role: AudioRole | null; tags: string[] }) => {
    try {
      await tagAudioRef(id, t);
      if (p.projectId) p.onRefsChanged(await listAudioRefs(p.projectId));
      toast('Tags saved', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not save the tags', 'error'); throw e; }
  };
  // The song playing right now, saved to the project and tagged to the scene in view in one tap (a temp score until you say otherwise).
  const tagPlaying = async () => {
    const cur = spotify.currentTrack;
    if (!cur || !p.projectId || !p.sceneId) return;
    const uri = (cur as { uri?: string }).uri;
    if (!uri) { toast('This song cannot be tagged (no link)', 'error'); return; }
    try {
      const existing = p.refs.find((r) => r.uri === uri);
      if (existing) await tagAudioRef(existing.id, { sceneId: p.sceneId, role: (existing.role as AudioRole | null) ?? 'temp', tags: existing.tags ?? [] });
      else await addAudioRef({ projectId: p.projectId, userId: p.userId, type: 'spotify', uri, title: `${cur.name} — ${cur.artists?.[0]?.name ?? ''}`, description: mood.mood, sceneId: p.sceneId, role: 'temp', tags: [] });
      p.onRefsChanged(await listAudioRefs(p.projectId));
      toast(`Tagged to ${p.sceneLabel ?? 'this scene'}`, 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not tag the song', 'error'); }
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
        {ios && (
          <p role="note" style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.4 }}>
            Hearing nothing on iPhone? The table read follows the side switch: it stays silent unless the phone is out of silent mode (switch up, no orange) and the volume is up.
          </p>
        )}
      </section>

      <section aria-label="Music for this scene">
        {heading(<Music size={14} />, 'Music for this scene')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, color: 'var(--fg-muted)' }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: mood.color }} />
          <span>{p.sceneLabel ?? 'No scene yet'} reads as <strong style={{ color: 'var(--fg)' }}>{mood.mood}</strong></span>
        </div>
        {spotify.currentTrack && (
          <div style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.08)', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" aria-label={spotify.isPlaying ? 'Pause music' : 'Play music'} style={round} onClick={spotify.togglePlay}>{spotify.isPlaying ? <Pause size={18} /> : <Play size={18} />}</button>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spotify.currentTrack.name}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spotify.currentTrack.artists?.map((a) => a.name).join(', ')}</div>
              </div>
            </div>
            {spotify.durationMs > 0 && (
              <input type="range" aria-label="Position in the song" min={0} max={spotify.durationMs} step={1000} value={Math.min(spotify.progressMs, spotify.durationMs)}
                onChange={(e) => spotify.seek(Number(e.target.value))} style={{ width: '100%', marginTop: 6 }} />
            )}
            {p.sceneId && p.projectId && (
              <button type="button" style={{ ...ghost, marginTop: 6, width: '100%' }} onClick={() => void tagPlaying()}>Tag this song to {p.sceneLabel ?? 'this scene'}</button>
            )}
            {spotify.elsewhere && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 11, color: 'var(--fg-muted)' }}>
                <span style={{ flex: 1, minWidth: 0 }}>Playing on {spotify.elsewhere.name}. These controls drive it.</span>
                <button type="button" style={{ ...ghost, minHeight: 44 }} onClick={() => { void spotify.playHere().then((ok) => { if (!ok) toast('Could not move the music here: open the Cavern player first', 'error'); }); }}>Play here</button>
              </div>
            )}
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
                <li key={t.id}>
                  <SpotifyPreview id={t.id} label={t.name}>{(previewButton, previewFrame) => (<>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" aria-label={`Play ${t.name}`} style={{ ...round, width: 44, height: 44 }} onClick={() => { void spotify.playUri(t.uri); }}><Play size={16} /></button>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.artist}</div>
                      </div>
                      {previewButton}
                      <button type="button" aria-label={`Save ${t.name} to the project`} style={{ ...ghost, minWidth: 44, padding: 0 }} onClick={() => void save(t)}><BookmarkPlus size={16} /></button>
                    </div>
                    {previewFrame}
                  </>)}</SpotifyPreview>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section aria-label="Saved tracks">
        {heading(<Music size={14} />, 'Saved to this project')}
        {p.refs.length === 0 ? <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-dim)', fontStyle: 'italic' }}>Nothing saved yet. Save a suggestion above, or link tracks from Soundtrack.</p> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...p.refs].sort((a, b) => Number(!!p.sceneId && b.for_scene === p.sceneId) - Number(!!p.sceneId && a.for_scene === p.sceneId)).map((ref) => {
              const here = !!p.sceneId && ref.for_scene === p.sceneId;
              return (
                <li key={ref.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button type="button" aria-label={`Play ${ref.title || ref.name || 'track'}`} style={round} onClick={() => p.playRef(ref)}><Play size={16} /></button>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ref.title || ref.name || ref.uri || 'Untitled track'}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2, fontSize: 11, color: 'var(--fg-muted)' }}>
                        <span>{ref.reference_type === 'spotify' ? 'Spotify' : ref.reference_type === 'custom_upload' ? 'Upload' : ref.reference_type || 'audio'}</span>
                        {here && <span style={{ color: 'var(--accent)' }}>· this scene</span>}
                        {ref.role && <span>· {AUDIO_ROLES[ref.role as AudioRole] ?? ref.role}</span>}
                        {(ref.tags ?? []).map((t) => <span key={t} style={{ padding: '0 6px', borderRadius: 4, border: '1px solid rgba(var(--ink-rgb), 0.14)' }}>{t}</span>)}
                      </div>
                    </div>
                    <button type="button" aria-label={`Tag ${ref.title || ref.name || 'track'}`} style={{ ...ghost, padding: '0 12px' }} onClick={() => setTagging(tagging === ref.id ? null : ref.id)}>Tag</button>
                  </div>
                  {tagging === ref.id && <TrackTagger track={ref} sceneId={p.sceneId} onSave={(t) => retag(ref.id, t)} onClose={() => setTagging(null)} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
