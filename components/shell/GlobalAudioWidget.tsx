'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc } from 'lucide-react';
import { CavernVisualizer } from './CavernVisualizer';
import { MiniPlayer } from './MiniPlayer';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { useToast } from '@/components/ui/Toast';
import { redirectToSpotifyAuth } from '@/lib/spotify/auth';

export default function GlobalAudioWidget() {
  const { isAuthenticated, isPlaying } = useSpotify();
  const { toast } = useToast();

  const [expanded, setExpanded] = useState(false);
  const [visualizer, setVisualizer] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (!isAuthenticated) {

    return (
      <div style={{ position: 'relative' }}>
        <motion.button
          onClick={async () => { const problem = await redirectToSpotifyAuth(); if (problem) toast(problem, 'error'); }}
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
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)',
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

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setExpanded(o => !o)}
        aria-expanded={expanded}
        aria-label={isPlaying ? 'Music, playing' : 'Music'}
        title={isPlaying ? 'Music, playing' : 'Music'}
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
      </button>

      {visualizer && <CavernVisualizer onClose={() => setVisualizer(false)} />}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 14px)', right: 0,
              width: 300, background: 'var(--surface)',
              border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 14,
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              overflow: 'hidden', backdropFilter: 'blur(30px)',
              zIndex: 9000
            }}
          >
            <MiniPlayer onFull={() => { setVisualizer(true); setExpanded(false); }} onNavigate={() => setExpanded(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

