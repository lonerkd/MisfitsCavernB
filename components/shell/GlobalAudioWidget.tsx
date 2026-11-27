'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc } from 'lucide-react';
import { MiniPlayer } from './MiniPlayer';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { useCavern } from '@/lib/cavern/CavernContext';
import { useToast } from '@/components/ui/Toast';
import { redirectToSpotifyAuth } from '@/lib/spotify/auth';
import { useIslandPopover } from '@/lib/island/popover';
import { useIslandSurface } from '@/lib/island/useIslandSurface';
import s from '../island/island.module.css';

/**
 * The Sound button on the island. It is an island button like the others (the shared `.btn` in a `.slot`: same size, shape,
 * stroke, hover, focus ring and open state); something playing shows as the same small dot the project button wears.
 */
export default function GlobalAudioWidget() {
  const { isAuthenticated, isPlaying } = useSpotify();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const cavern = useCavern();
  const { rootRef, buttonRef } = useIslandPopover<HTMLSpanElement>('sound', expanded, () => setExpanded(false));
  // On a phone the player spans the screen above the island, like the bell's panel — anchored to its
  // button it ran off the left edge (the owner's shots, Nov 26, 2026). See NotificationBell's panelFit.
  const compact = useIslandSurface() === 'compact-dock';
  const panelFit: React.CSSProperties = compact
    ? { position: 'fixed', left: 12, right: 12, bottom: 'calc(100dvh - var(--island-room, 70vh) - 14px)', width: 'auto' }
    : { position: 'absolute', bottom: 'calc(100% + 14px)', right: 0, width: 300 };

  if (!isAuthenticated) {
    return (
      <span className={s.slot} data-tip="Connect Spotify">
        <button
          type="button"
          className={s.btn}
          aria-label="Connect Spotify"
          onClick={async () => { const problem = await redirectToSpotifyAuth(); if (problem) toast(problem, 'error'); }}
        >
          <Disc size={19} strokeWidth={1.5} aria-hidden />
        </button>
      </span>
    );
  }

  const label = isPlaying ? 'Sound, playing' : 'Sound';
  return (
    <span ref={rootRef} className={s.slot} data-tip={label} data-open={expanded}>
      <button
        ref={buttonRef}
        type="button"
        className={s.btn}
        onClick={() => setExpanded(o => !o)}
        aria-haspopup="true"
        aria-expanded={expanded}
        aria-label={label}
      >
        <Disc size={19} strokeWidth={1.5} aria-hidden />
        {isPlaying && <span className={s.pip} style={{ background: 'var(--ok)' }} aria-hidden />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            data-island-popover="sound"
            style={{
              ...panelFit,
              background: 'var(--surface)',
              border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 14,
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              overflow: 'hidden auto', maxHeight: 'var(--island-room, 70vh)', backdropFilter: 'blur(30px)',
              zIndex: 9000
            }}
          >
            <MiniPlayer onFull={() => { cavern.open(); setExpanded(false); }} onNavigate={() => setExpanded(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
