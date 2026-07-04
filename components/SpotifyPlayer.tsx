'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc } from 'lucide-react';

const PLAYLISTS = [
  { id: '79HohMGeX0HuPvtaQDVwgN', name: 'Misfits Cavern', tag: 'Main' },
  { id: '5l43HDI8tByYgidQJ4Nfzz', name: 'Hall of Fame', tag: 'Masterpieces' },
  { id: '76529bfVFUIK9znlxPXw5W', name: 'Misfits Too', tag: 'Experimental' },
  { id: '3iFM46jnAkoQmsucygQMas', name: 'Solitude', tag: 'Writing' },
];

export default function SpotifyPlayer() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(PLAYLISTS[0].id);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px',
          background: open ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 9999,
          cursor: 'pointer',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>
          <Disc size={11} style={{ color: '#10b981', flexShrink: 0 }} />
        </motion.div>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1.5,
          color: 'var(--fg-muted)', textTransform: 'uppercase',
        }}>
          Music
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              width: 360, zIndex: 500,
              background: 'rgba(8,8,8,0.98)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
            }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
