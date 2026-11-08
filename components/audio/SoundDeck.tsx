'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Disc, LogOut, Maximize2, Pause, Play, RefreshCw, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { useToast } from '@/components/ui/Toast';
import { CavernVisualizer } from '@/components/shell/CavernVisualizer';
import { ListenWithoutPremium } from './ListenWithoutPremium';

const mmss = (ms: number) => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const btn = 'inline-flex items-center justify-center rounded-full border border-[rgba(var(--ink-rgb),0.14)] bg-transparent text-[var(--fg)] cursor-pointer min-w-[44px] min-h-[44px]';

/**
 * The now-playing deck at the top of the Sound page: the same state as the corner player, the island and the editor (one
 * `useSpotify()`), so a song started anywhere is here at once, with the device it is on. It is the corner player's big version:
 * transport, seek, volume, "Play here" when the music is on another device, and the full-screen cavern.
 */
export function SoundDeck() {
  const s = useSpotify();
  const { toast } = useToast();
  const [cave, setCave] = useState(false);
  const track = s.currentTrack;
  const art = track?.album?.images?.[0]?.url;

  return (
    <section aria-label="Now playing" className="mb-8 rounded-2xl border border-[rgba(var(--ink-rgb),0.08)] bg-[var(--sunken)] p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-4">
        {art ? <Image src={art} alt="" width={64} height={64} className="rounded-lg object-cover shrink-0" />
          : <div className="w-16 h-16 rounded-lg bg-[rgba(var(--ink-rgb),0.05)] flex items-center justify-center shrink-0"><Disc size={22} className="opacity-40" /></div>}
        <div className="min-w-0 flex-1 basis-48">
          <div className="mc-title text-lg truncate">{track?.name ?? 'Nothing playing'}</div>
          <div className="mc-text text-xs text-[var(--fg-dim)] truncate">
            {track ? track.artists?.map((a) => a.name).join(', ') : 'Start a song below, or in Spotify on any device: it shows up here.'}
          </div>
          {s.elsewhere && (
            <div className="mc-text text-xs text-[var(--fg-muted)] mt-1 flex flex-wrap items-center gap-2">
              <span>Playing on {s.elsewhere.name}.</span>
              <button type="button" className="underline cursor-pointer min-h-[44px]" onClick={() => { void s.playHere().then((ok) => { if (!ok) toast('Could not move the music here: open the Cavern player first', 'error'); }); }}>Play here</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous track" className={btn} onClick={s.prevTrack}><SkipBack size={18} /></button>
          <button type="button" aria-label={s.isPlaying ? 'Pause' : 'Play'} className={`${btn} bg-[var(--fg)] text-[var(--bg)] border-transparent min-w-[52px] min-h-[52px]`} onClick={s.togglePlay}>
            {s.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button type="button" aria-label="Next track" className={btn} onClick={s.nextTrack}><SkipForward size={18} /></button>
          <button type="button" aria-label="Full screen cavern" title="Full screen" className={btn} onClick={() => setCave(true)}><Maximize2 size={16} /></button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 mc-text text-xs text-[var(--fg-muted)]">
        <span className="tabular-nums w-10 text-right">{mmss(s.progressMs)}</span>
        <input type="range" aria-label="Position in the song" min={0} max={Math.max(1, s.durationMs)} step={1000} disabled={!s.durationMs}
          value={Math.min(s.progressMs, s.durationMs || 0)} onChange={(e) => s.seek(Number(e.target.value))} className="flex-1" style={{ height: 44 }} />
        <span className="tabular-nums w-10">{mmss(s.durationMs)}</span>
        <Volume2 size={14} aria-hidden className="hidden sm:block" />
        <input type="range" aria-label="Volume" min={0} max={1} step={0.01} value={s.volume} onChange={(e) => s.setVolumeLevel(Number(e.target.value))} className="hidden sm:block w-24" style={{ height: 44 }} />
      </div>
      {/* What the corner player's panel used to hold: which player Spotify is using, and signing out. */}
      <details className="mt-3 mc-text text-xs text-[var(--fg-muted)]">
        <summary className="cursor-pointer min-h-[44px] flex items-center">Player settings</summary>
        <div className="flex flex-wrap items-center gap-3 pb-1">
          <span>Mode: {s.useIframeFallback ? 'Free (Spotify’s own player)' : 'Premium (in-app player)'}</span>
          <button type="button" className="inline-flex items-center gap-1 underline cursor-pointer min-h-[44px]" onClick={() => s.setUseIframeFallback(!s.useIframeFallback)}>
            <RefreshCw size={12} aria-hidden /> Switch to {s.useIframeFallback ? 'the in-app player' : 'free mode'}
          </button>
          <button type="button" className="inline-flex items-center gap-1 underline cursor-pointer min-h-[44px]" onClick={s.logout}><LogOut size={12} aria-hidden /> Disconnect Spotify</button>
        </div>
      </details>
      {s.useIframeFallback && <div className="mt-2"><ListenWithoutPremium /></div>}
      {cave && <CavernVisualizer onClose={() => setCave(false)} />}
    </section>
  );
}
