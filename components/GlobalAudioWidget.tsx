'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Disc, Volume2, LogOut, Link2Off, RefreshCw } from 'lucide-react';
import { useSpotify } from '@/lib/context/SpotifyContext';
import { redirectToSpotifyAuth } from '@/lib/spotify/auth';

// Utility to format ms into m:ss
const formatMs = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function GlobalAudioWidget() {
  const { 
    isAuthenticated, isPremium, isSDKReady, 
    currentTrack, isPlaying, progressMs, durationMs, 
    volume, setVolumeLevel, togglePlay, nextTrack, prevTrack,
    useIframeFallback, setUseIframeFallback, logout 
  } = useSpotify();

  const [expanded, setExpanded] = useState(false);
  const [iframeUri, setIframeUri] = useState('79HohMGeX0HuPvtaQDVwgN'); // Misfits Cavern playlist fallback

  if (!isAuthenticated) {
    return (
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9000 }}>
        <button
          onClick={redirectToSpotifyAuth}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 9999,
            background: 'rgba(30,215,96,0.15)', border: '1px solid rgba(30,215,96,0.4)',
            color: '#1ed760', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1,
            textTransform: 'uppercase', cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}
        >
          <Disc size={14} /> Connect Spotify
        </button>
      </div>
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
          <div style={{ width: `${durationMs ? (progressMs / durationMs) * 100 : 0}%`, height: '100%', background: '#1ed760', transition: 'width 1s linear' }} />
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
            style={{ width: 60, accentColor: '#1ed760' }}
          />
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 8, textTransform: 'uppercase' }}>
          <LogOut size={10} /> Disconnect
        </button>
      </div>
    </div>
  );

  const renderFreeUI = () => (
    <div style={{ padding: 12 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#f59e0b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>
        Free Account Mode Active
      </div>
      <iframe
        src={`https://open.spotify.com/embed/playlist/${iframeUri}?utm_source=generator&theme=0`}
        width="100%" height="352" style={{ border: 'none', borderRadius: 12 }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 8, textTransform: 'uppercase' }}>
          <LogOut size={10} /> Disconnect
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9000 }}>
      {/* Floating Toggle Button */}
      <motion.button
        layout
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 9999,
          background: 'rgba(8, 8, 8, 0.95)', border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1,
          textTransform: 'uppercase', cursor: 'pointer',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
          position: 'absolute', bottom: 0, right: 0
        }}
      >
        <motion.div animate={isPlaying ? { rotate: 360 } : {}} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>
          <Disc size={14} color="#1ed760" />
        </motion.div>
        {isPlaying ? (currentTrack?.name || 'Playing') : 'Audio Engine'}
      </motion.button>

      {/* Expanded Widget */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', bottom: 44, right: 0,
              width: 300, background: 'rgba(8, 8, 8, 0.98)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              overflow: 'hidden', backdropFilter: 'blur(30px)'
            }}
          >
            {/* Header Settings Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg)', letterSpacing: 1, textTransform: 'uppercase' }}>
                Engine Status
              </span>
              <button 
                onClick={() => setUseIframeFallback(!useIframeFallback)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  fontFamily: 'var(--mono)', fontSize: 8, color: useIframeFallback ? '#f59e0b' : '#1ed760', textTransform: 'uppercase'
                }}
              >
                <RefreshCw size={10} />
                {useIframeFallback ? 'Free Mode' : 'SDK Mode'}
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
