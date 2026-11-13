'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Disc, Maximize2, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useSpotify } from '@/lib/os/SpotifyContext';

/**
 * The corner player's panel: what is playing, the transport, a thin progress line, the full-screen cavern and a way to the Sound
 * page, where everything else (find music, the source picker for listening without Premium, mode, disconnect) lives. Small on
 * purpose: the page is the place to work; this is the remote that follows you.
 */
export function MiniPlayer({ onFull, onNavigate }: { onFull: () => void; onNavigate: () => void }) {
  const s = useSpotify();
  const track = s.currentTrack;
  const art = track?.album?.images?.[0]?.url;
  const pct = s.durationMs ? Math.min(100, (s.progressMs / s.durationMs) * 100) : 0;
  const ctl = { background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14 } as const;

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {art ? <Image src={art} alt="" width={44} height={44} style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Disc size={18} style={{ opacity: 0.4 }} /></div>}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track?.name ?? 'Nothing playing'}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {track ? (s.elsewhere ? `on ${s.elsewhere.name}` : track.artists?.map((a) => a.name).join(', ')) : 'Find something on the Sound page'}
          </div>
        </div>
        <button type="button" aria-label="Full screen cavern" title="Full screen" onClick={onFull} style={ctl}><Maximize2 size={15} /></button>
      </div>
      {track && (
        <>
          <div aria-hidden style={{ height: 3, borderRadius: 4, background: 'var(--sunken)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--ok)', transition: 'width 1s linear' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <button type="button" aria-label="Previous track" onClick={s.prevTrack} style={ctl}><SkipBack size={18} /></button>
            <button type="button" aria-label={s.isPlaying ? 'Pause' : 'Play'} onClick={s.togglePlay} style={{ ...ctl, background: 'var(--fg)', color: 'var(--bg)', borderRadius: 28, minWidth: 48, minHeight: 48 }}>
              {s.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
            <button type="button" aria-label="Next track" onClick={s.nextTrack} style={ctl}><SkipForward size={18} /></button>
          </div>
        </>
      )}
      <Link href="/soundtrack" onClick={onNavigate} style={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.14)', color: 'var(--fg)', fontSize: 13, textDecoration: 'none' }}>
        Open Sound
      </Link>
    </div>
  );
}
