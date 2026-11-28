'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Disc, LogOut, Maximize2, Pause, Play, Settings2, SkipBack, SkipForward, Tag, Volume2 } from 'lucide-react';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { useToast } from '@/components/ui/Toast';
import { useCavern } from '@/lib/cavern/CavernContext';
import { usePhoneLayout } from '@/lib/os/usePhone';
import { DiscSwitch } from '@/components/ui/DiscSwitch';
import { listAudioRefs, listSceneChoices } from '@/lib/supabase/audio';
import { ListenWithoutPremium } from './ListenWithoutPremium';

const mmss = (ms: number) => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const btn = 'inline-flex items-center justify-center rounded-full border border-[rgba(var(--ink-rgb),0.14)] bg-transparent text-[var(--fg)] cursor-pointer min-w-[44px] min-h-[44px]';

type SpotifyApi = ReturnType<typeof useSpotify>;

/** The deck's own settings: which player Spotify is using, as the house disc switch, and signing out. Folded into the
    deck behind its gear — never a stray line under it. Free mode is an on/off, so it is the disc (the suite's one switch). */
function PlayerSettings({ s }: { s: SpotifyApi }) {
  return (
    <div className="mt-3 border-t border-[rgba(var(--ink-rgb),0.08)] pt-3 mc-text text-xs text-[var(--fg-muted)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span>Mode: {s.useIframeFallback ? 'Free (Spotify’s own player)' : 'Premium (in-app player)'}</span>
        <span className="inline-flex items-center gap-2">
          <DiscSwitch label="Free mode" on={s.useIframeFallback} onChange={(next) => s.setUseIframeFallback(next)} />
          Free mode
        </span>
        <button type="button" className="inline-flex items-center gap-1 underline cursor-pointer min-h-[44px]" onClick={s.logout}><LogOut size={12} aria-hidden /> Disconnect Spotify</button>
      </div>
      <p className="mt-1">Free mode plays through Spotify’s own embedded players — the listening surface below — for an account without Premium.</p>
    </div>
  );
}

/**
 * The now-playing deck at the top of the Sound page: the same state as the corner player, the island and the editor (one
 * `useSpotify()`), so a song started anywhere is here at once, with the device it is on.
 *
 * The deck earns its place (Sound upgrade S1): with a track loaded it is artwork-led — the art, the track, the scene it is
 * tagged to in this project, transport that works and a live scrubber. With nothing loaded it collapses to a slim strip:
 * one line (the last thing played here, with a way to play it again; otherwise just "Nothing playing"), the settings gear,
 * and the page's real content starting immediately. Player settings live in the deck's own menu behind the gear.
 */
export function SoundDeck({ projectId = null }: { projectId?: string | null }) {
  const s = useSpotify();
  const { toast } = useToast();
  const cavern = useCavern();
  const { phone, landscape } = usePhoneLayout();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const track = s.currentTrack;
  const art = track?.album?.images?.[0]?.url;

  // The last track this deck saw, so the collapsed strip can name it (and replay it) once playback stops.
  const [lastPlayed, setLastPlayed] = useState<{ name: string; artists: string; uri: string | null; art: string | null } | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- remembers the track that just stopped
    if (track) setLastPlayed({ name: track.name, artists: track.artists?.map((a) => a.name).join(', ') ?? '', uri: track.uri ?? null, art: track.album?.images?.[0]?.url ?? null });
  }, [track]);

  // The scene the current track is tagged to in this project, when it is: the project's refs name it by uri.
  const uri = track?.uri ?? null;
  const [tag, setTag] = useState<{ uri: string; label: string } | null>(null);
  useEffect(() => {
    if (!projectId || !uri) return;
    let on = true;
    (async () => {
      const refs = await listAudioRefs(projectId);
      const ref = refs.find((r) => r.uri === uri && r.for_scene);
      if (!ref?.for_scene) return;
      const scenes = await listSceneChoices(projectId);
      const label = scenes.find((sc) => sc.id === ref.for_scene)?.label;
      if (on && label) setTag({ uri, label });
    })().catch(() => { /* a failed lookup just leaves the line off */ });
    return () => { on = false; };
  }, [projectId, uri]);
  const taggedScene = tag && tag.uri === uri ? tag.label : null;

  const gear = (
    <button type="button" aria-label="Player settings" aria-expanded={settingsOpen} className={btn} onClick={() => setSettingsOpen((o) => !o)}>
      <Settings2 size={17} />
    </button>
  );
  const elsewhere = s.elsewhere && (
    <div className="mc-text text-xs text-[var(--fg-muted)] mt-1 flex flex-wrap items-center gap-2">
      <span>Playing on {s.elsewhere.name}.</span>
      <button type="button" className="underline cursor-pointer min-h-[44px]" onClick={() => { void s.playHere().then((ok) => { if (!ok) toast('Could not move the music here: open the Cavern player first', 'error'); }); }}>Play here</button>
    </div>
  );

  // Nothing loaded: the slim strip. No scrubber, no dead transport — one line and the gear.
  if (!track) {
    return (
      <section aria-label="Now playing" className={`${phone ? 'mb-4 px-3 py-2' : 'mb-6 px-4 py-2'} rounded-2xl border border-[rgba(var(--ink-rgb),0.08)] bg-[var(--sunken)]`} data-compact={phone ? (landscape ? 'landscape' : 'portrait') : undefined}>
        <div className="flex items-center gap-3">
          {lastPlayed?.art
            ? <Image src={lastPlayed.art} alt="" width={36} height={36} className="w-9 h-9 rounded-md object-cover shrink-0" />
            : <div className="w-9 h-9 rounded-md bg-[rgba(var(--ink-rgb),0.05)] flex items-center justify-center shrink-0"><Disc size={16} className="opacity-40" /></div>}
          <div className="mc-text text-sm text-[var(--fg-dim)] min-w-0 flex-1 truncate">
            {lastPlayed
              ? <><span className="text-[var(--fg-muted)]">Last played · </span><span className="text-[var(--fg)]">{lastPlayed.name}</span>{lastPlayed.artists ? ` — ${lastPlayed.artists}` : ''}</>
              : 'Nothing playing'}
          </div>
          {lastPlayed?.uri && (
            <button type="button" aria-label={`Play ${lastPlayed.name}`} className={`${btn} bg-[var(--fg)] text-[var(--bg)] border-transparent`} onClick={() => { void s.playUri(lastPlayed.uri!); }}>
              <Play size={16} fill="currentColor" />
            </button>
          )}
          {gear}
        </div>
        {elsewhere}
        {settingsOpen && <PlayerSettings s={s} />}
        {s.useIframeFallback && <div className="mt-2"><ListenWithoutPremium /></div>}
      </section>
    );
  }

  return (
    <section aria-label="Now playing" className={`${phone ? 'mb-4 p-3' : 'mb-8 p-4 md:p-5'} rounded-2xl border border-[rgba(var(--ink-rgb),0.08)] bg-[var(--sunken)]`} data-compact={phone ? (landscape ? 'landscape' : 'portrait') : undefined}>
      <div className={`flex flex-wrap items-center ${phone ? 'gap-3' : 'gap-4'}`}>
        {art ? <Image src={art} alt="" width={88} height={88} className={`${phone ? 'w-16 h-16' : 'w-[88px] h-[88px]'} rounded-lg object-cover shrink-0`} />
          : <div className={`${phone ? 'w-16 h-16' : 'w-[88px] h-[88px]'} rounded-lg bg-[rgba(var(--ink-rgb),0.05)] flex items-center justify-center shrink-0`}><Disc size={26} className="opacity-40" /></div>}
        <div className="min-w-0 flex-1 basis-48">
          <div className={`mc-title ${phone ? 'text-lg' : 'text-xl'} truncate`}>{track.name}</div>
          <div className="mc-text text-xs text-[var(--fg-dim)] truncate">
            {track.artists?.map((a) => a.name).join(', ')}
          </div>
          {taggedScene && (
            <div className="mc-text text-xs text-[var(--fg-muted)] mt-1 flex items-center gap-1">
              <Tag size={11} aria-hidden className="shrink-0" /> Tagged to {taggedScene}
            </div>
          )}
          {elsewhere}
        </div>
        <div className={`flex items-center gap-2 ${phone ? 'w-full justify-between' : ''}`}>
          <button type="button" aria-label="Previous track" className={btn} onClick={s.prevTrack}><SkipBack size={18} /></button>
          <button type="button" aria-label={s.isPlaying ? 'Pause' : 'Play'} className={`${btn} bg-[var(--fg)] text-[var(--bg)] border-transparent min-w-[52px] min-h-[52px]`} onClick={s.togglePlay}>
            {s.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button type="button" aria-label="Next track" className={btn} onClick={s.nextTrack}><SkipForward size={18} /></button>
          <button type="button" aria-label="Full screen cavern" title="Full screen" className={btn} onClick={cavern.open}><Maximize2 size={16} /></button>
          {gear}
          {!phone && <Link href="/cavern" className="mc-text text-xs underline text-[var(--fg-muted)] min-h-[44px] inline-flex items-center" title="The cavern as its own page, to leave open on a second screen">Cavern page</Link>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 mc-text text-xs text-[var(--fg-muted)]">
        <span className="tabular-nums w-9 shrink-0 text-right">{mmss(s.progressMs)}</span>
        <input type="range" aria-label="Position in the song" min={0} max={Math.max(1, s.durationMs)} step={1000} disabled={!s.durationMs}
          value={Math.min(s.progressMs, s.durationMs || 0)} onChange={(e) => s.seek(Number(e.target.value))} className="flex-1 min-w-0" style={{ height: 44 }} />
        <span className="tabular-nums w-9 shrink-0">{mmss(s.durationMs)}</span>
        {!phone && <Volume2 size={14} aria-hidden className="hidden sm:block" />}
        {!phone && <input type="range" aria-label="Volume" min={0} max={1} step={0.01} value={s.volume} onChange={(e) => s.setVolumeLevel(Number(e.target.value))} className="hidden sm:block w-24" style={{ height: 44 }} />}
      </div>
      {settingsOpen && <PlayerSettings s={s} />}
      {s.useIframeFallback && <div className="mt-2"><ListenWithoutPremium /></div>}
    </section>
  );
}
