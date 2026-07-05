'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Disc, Volume2, LogOut, Link2Off, RefreshCw } from 'lucide-react';
import { useSpotify } from '@/lib/context/SpotifyContext';
import { redirectToSpotifyAuth } from '@/lib/spotify/auth';

const formatMs = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const PLAYLISTS = [
  { id: '79HohMGeX0HuPvtaQDVwgN', name: 'Misfits Cavern', tag: 'Main' },
  { id: '37i9dQZF1DXcBWIGoYBM5M', name: 'Hall of Fame', tag: 'Masterpieces' },
  { id: '76529bfVFUIK9znlxPXw5W', name: 'Misfits Too', tag: 'Experimental' },
  { id: '37i9dQZF1DXaImRpG7HXqI', name: 'Solitude', tag: 'Writing' },
];

export default function GlobalAudioWidget() {
  const { 
    isAuthenticated, isPremium, currentTrack, isPlaying, progressMs, durationMs, 
    volume, setVolumeLevel, togglePlay, nextTrack, prevTrack,
    useIframeFallback, setUseIframeFallback, logout 
  } = useSpotify();

  const [expanded, setExpanded] = useState(false);
  const [activeId, setActiveId] = useState(PLAYLISTS[0].id);

  if (!isAuthenticated) {
    return (
      <button
        onClick={redirectToSpotifyAuth}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', borderRadius: 9999,
          background: 'rgba(30,215,96,0.1)', border: '1px solid rgba(30,215,96,0.3)',
          color: '#1ed760', fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.5,
          textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        <Disc size={11} /> Connect Audio
      </button>
    );
  }

  const renderPremiumUI = () => (
    <div style={{ padding: 16 }}>
      {/* Track Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        {currentTrack?.album?.images?.[0]?.url ? (
          <img src={currentTrack.album.images[0].url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Disc size={20} color="rgba(255,255,255,0.2)" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: '1rem', color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack?.name || 'No track playing'}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>
            {currentTrack?.artists.map(a => a.name).join(', ') || 'Ready for playback'}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${durationMs ? (progressMs / durationMs) * 100 : 0}%`, height: '100%', background: '#10b981', transition: 'width 1s linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-muted)' }}>
          <span>{formatMs(progressMs)}</span>
          <span>{formatMs(durationMs)}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <button onClick={prevTrack} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}><SkipBack size={18} /></button>
        <button 
          onClick={togglePlay}
          style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--fg)', color: 'var(--bg-main)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>
        <button onClick={nextTrack} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}><SkipForward size={18} /></button>
      </div>

      {/* Footer / Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Volume2 size={12} color="var(--fg-muted)" />
          <input 
            type="range" min={0} max={1} step={0.01} value={volume}
            onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
            style={{ width: 60, accentColor: '#10b981' }}
          />
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 8, textTransform: 'uppercase' }}>
          <LogOut size={10} /> Disconnect
        </button>
      </div>
    </div>
  );

  const renderFreeUI = () => (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {PLAYLISTS.map(pl => {
          const active = pl.id === activeId;
          return (
            <button
              key={pl.id}
              onClick={() => setActiveId(pl.id)}
              style={{
                padding: '6px 11px', borderRadius: 9999,
                background: active ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: active ? '#10b981' : 'rgba(224, 221, 174,0.4)',
                fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1,
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title={pl.tag}
            >
              {pl.name}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ borderRadius: 12, overflow: 'hidden' }}
        >
          <iframe
            key={activeId}
            src={`https://open.spotify.com/embed/playlist/${activeId}?utm_source=generator&theme=0`}
            width="100%"
            height="352"
            style={{ border: 'none', borderRadius: 12, display: 'block' }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Spotify playlist player"
          />
        </motion.div>
      </AnimatePresence>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 8, textTransform: 'uppercase' }}>
          <LogOut size={10} /> Disconnect
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setExpanded(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px',
          background: expanded ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${expanded ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 9999,
          cursor: 'pointer',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>
          <Disc size={11} style={{ color: '#10b981', flexShrink: 0 }} />
        </motion.div>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.5,
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
              width: 360, background: 'rgba(8, 8, 8, 0.98)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              overflow: 'hidden', backdropFilter: 'blur(30px)',
              zIndex: 9000
            }}
          >
            {/* Header Settings Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-muted)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Mode: {useIframeFallback ? 'Free' : 'Premium'}
              </span>
              <button 
                onClick={() => setUseIframeFallback(!useIframeFallback)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  fontFamily: 'var(--mono)', fontSize: 7, letterSpacing: 1, color: useIframeFallback ? '#f59e0b' : '#10b981', textTransform: 'uppercase'
                }}
              >
                <RefreshCw size={9} />
                Switch to {useIframeFallback ? 'SDK' : 'Free'}
              </button>
            </div>

            {useIframeFallback ? renderFreeUI() : (!isPremium ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <Link2Off size={24} color="#d7340b" style={{ marginBottom: 12 }} />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#d7340b', textTransform: 'uppercase', marginBottom: 12 }}>Premium Required</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-muted)', marginBottom: 16 }}>Spotify blocked the Web Playback connection. You must use Free Mode.</div>
                <button 
                  onClick={() => setUseIframeFallback(true)}
                  style={{ background: '#d7340b', color: '#000', border: 'none', padding: '6px 12px', borderRadius: 99, fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', cursor: 'pointer' }}
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

