'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Play, Pause, SkipBack, SkipForward, Disc, Volume2, LogOut, Link2Off, RefreshCw } from 'lucide-react';
import { useSpotify } from '@/lib/context/SpotifyContext';
import { redirectToSpotifyAuth } from '@/lib/spotify/auth';
import { parseSpotifyRef, spotifyEmbedSrc, type SpotifyRef } from '@/lib/spotify/refs';
import { myPlaylists } from '@/lib/spotify/search';
import { useProject } from '@/lib/os';
import { listSpotifyRefs } from '@/lib/supabase/audio';

const formatMs = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface Source { key: string; name: string; from: string; ref: SpotifyRef }

/**
 * What to listen to: the active project's Spotify references (its sound, as
 * the team collected it) and the listener's own playlists — nothing preset.
 */
function useListeningSources(enabled: boolean) {
  const { activeProject } = useProject();
  const [sources, setSources] = useState<Source[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let on = true;
    (async () => {
      const [refs, mine] = await Promise.all([
        activeProject?.id ? listSpotifyRefs(activeProject.id, 20).catch(() => []) : Promise.resolve([]),
        myPlaylists().catch(() => []),
      ]);
      if (!on) return;
      const list: Source[] = [];
      for (const r of refs) {
        const ref = parseSpotifyRef(r.uri);
        if (ref) list.push({ key: `p:${r.id}`, name: r.title || 'Project reference', from: activeProject?.title ?? 'This project', ref });
      }
      for (const p of mine) list.push({ key: `m:${p.id}`, name: p.name, from: 'Your playlists', ref: { kind: 'playlist', id: p.id } });
      setSources(list);
    })().catch(() => { if (on) setSources([]); });
    return () => { on = false; };
  }, [enabled, activeProject?.id, activeProject?.title]);
  return sources;
}

export default function GlobalAudioWidget() {
  const {
    isAuthenticated, isPremium, currentTrack, isPlaying, progressMs, durationMs,
    volume, setVolumeLevel, togglePlay, nextTrack, prevTrack,
    useIframeFallback, setUseIframeFallback, logout
  } = useSpotify();

  const [expanded, setExpanded] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const sources = useListeningSources(isAuthenticated && expanded && useIframeFallback);
  const active = sources?.find((x) => x.key === activeKey) ?? sources?.[0] ?? null;
  const [hovered, setHovered] = useState(false);

  if (!isAuthenticated) {

    return (
      <div style={{ position: 'relative' }}>
        <motion.button
          onClick={redirectToSpotifyAuth}
          aria-label="Connect Spotify"
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          whileHover={{ scale: 1.18, y: -6 }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          style={{
            width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hovered ? 'rgba(var(--ink-rgb), 0.06)' : 'transparent', border: 'none', cursor: 'pointer',
            color: hovered ? 'rgba(var(--fg-rgb), 0.7)' : 'rgba(var(--fg-rgb), 0.3)', transition: 'background 0.25s, color 0.25s',
          }}
        >
          <Disc size={18} strokeWidth={1.5} />
        </motion.button>
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.92 }} animate={{ opacity: 1, y: -10, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.92 }} transition={{ duration: 0.18 }}
              style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.1)', color: 'rgba(var(--fg-rgb), 0.85)',
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
                padding: '5px 10px', borderRadius: 8, whiteSpace: 'nowrap', pointerEvents: 'none', backdropFilter: 'blur(10px)',
              }}
            >
              Connect Spotify
              <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid rgba(var(--ink-rgb), 0.1)' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const renderPremiumUI = () => (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        {currentTrack?.album?.images?.[0]?.url ? (
          <Image src={currentTrack.album.images[0].url} alt="" width={48} height={48} style={{ borderRadius: 8, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Disc size={20} color="rgba(var(--ink-rgb), 0.2)" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: '1rem', color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack?.name || 'No track playing'}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
            {currentTrack?.artists.map(a => a.name).join(', ') || 'Ready for playback'}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ width: '100%', height: 4, background: 'rgba(var(--ink-rgb), 0.1)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${durationMs ? (progressMs / durationMs) * 100 : 0}%`, height: '100%', background: '#10b981', transition: 'width 1s linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
          <span>{formatMs(progressMs)}</span>
          <span>{formatMs(durationMs)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <button onClick={prevTrack} aria-label="Previous track" style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}><SkipBack size={18} /></button>
        <button
          onClick={togglePlay}
          style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--fg)', color: 'var(--bg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>
        <button aria-label="Next track" onClick={nextTrack} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}><SkipForward size={18} /></button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid rgba(var(--ink-rgb), 0.05)', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Volume2 size={12} color="var(--fg-muted)" />
          <input
            type="range" min={0} max={1} step={0.01} value={volume}
            onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
            style={{ width: 60, accentColor: '#10b981' }}
          />
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase' }}>
          <LogOut size={10} /> Disconnect
        </button>
      </div>
    </div>
  );

  const renderFreeUI = () => (
    <div style={{ padding: '0 16px 16px' }}>
      {sources === null ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', padding: '12px 0' }}>Loading…</div>
      ) : sources.length === 0 ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.6, color: 'var(--fg-muted)', padding: '8px 0 12px' }}>
          Nothing to play yet. Add Spotify links to the project’s sound (Soundtrack › Project, or the editor’s Audio panel), or make a playlist on Spotify — they show up here.
        </div>
      ) : (
        <>
          <div role="radiogroup" aria-label="What to play" style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', maxHeight: 96, overflowY: 'auto' }}>
            {sources.map((src) => {
              const on = src.key === active?.key;
              return (
                <button
                  key={src.key}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setActiveKey(src.key)}
                  style={{
                    padding: '6px 11px', borderRadius: 9999,
                    background: on ? 'rgba(16,185,129,0.14)' : 'rgba(var(--ink-rgb), 0.03)',
                    border: `1px solid ${on ? 'rgba(16,185,129,0.4)' : 'rgba(var(--ink-rgb), 0.06)'}`,
                    color: on ? 'var(--ok)' : 'var(--fg-dim)',
                    fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1,
                    textTransform: 'uppercase', cursor: 'pointer',
                    transition: 'all 0.2s', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  title={src.from}
                >
                  {src.name}
                </button>
              );
            })}
          </div>
          {active && (
            <AnimatePresence mode="wait">
              <motion.div
                key={active.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ borderRadius: 14, overflow: 'hidden' }}
              >
                <iframe
                  key={active.key}
                  src={spotifyEmbedSrc(active.ref)}
                  width="100%"
                  height={active.ref.kind === 'track' || active.ref.kind === 'episode' ? 152 : 352}
                  style={{ border: 'none', borderRadius: 14, display: 'block' }}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title={`Spotify player: ${active.name}`}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase' }}>
          <LogOut size={10} /> Disconnect
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setExpanded(o => !o)}
        aria-expanded={expanded}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px',
          background: expanded ? 'rgba(16,185,129,0.1)' : 'rgba(var(--ink-rgb), 0.03)',
          border: `1px solid ${expanded ? 'rgba(16,185,129,0.3)' : 'rgba(var(--ink-rgb), 0.06)'}`,
          borderRadius: 9999,
          cursor: 'pointer',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>
          <Disc size={11} style={{ color: 'var(--ok)', flexShrink: 0 }} />
        </motion.div>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5,
          color: 'var(--fg-muted)', textTransform: 'uppercase',
        }}>
          {isPlaying ? 'Playing' : 'Audio Engine'}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 14px)', right: 0,
              width: 360, background: 'var(--surface)',
              border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 14,
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              overflow: 'hidden', backdropFilter: 'blur(30px)',
              zIndex: 9000
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(var(--ink-rgb), 0.03)', borderBottom: '1px solid rgba(var(--ink-rgb), 0.05)', marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Mode: {useIframeFallback ? 'Free' : 'Premium'}
              </span>
              <button
                onClick={() => setUseIframeFallback(!useIframeFallback)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, color: useIframeFallback ? 'var(--warn)' : 'var(--ok)', textTransform: 'uppercase'
                }}
              >
                <RefreshCw size={9} />
                Switch to {useIframeFallback ? 'SDK' : 'Free'}
              </button>
            </div>

            {useIframeFallback ? renderFreeUI() : (!isPremium ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <Link2Off size={24} color="var(--accent)" style={{ marginBottom: 12 }} />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 12 }}>Premium Required</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', marginBottom: 16 }}>Spotify blocked the Web Playback connection. You must use Free Mode.</div>
                <button
                  onClick={() => setUseIframeFallback(true)}
                  style={{ background: 'var(--accent)', color: '#000', border: 'none', padding: '6px 12px', borderRadius: 9999, fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  Switch to Free Mode
                </button>
              </div>
            ) : renderPremiumUI())}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

