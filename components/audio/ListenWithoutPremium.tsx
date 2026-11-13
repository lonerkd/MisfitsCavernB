'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { parseSpotifyRef, spotifyEmbedSrc, type SpotifyRef } from '@/lib/spotify/refs';
import { myPlaylists } from '@/lib/spotify/search';
import { HOUSE_PLAYLISTS } from '@/lib/spotify/house';
import { useProject } from '@/lib/os';
import { listSpotifyRefs } from '@/lib/supabase/audio';

interface Source { key: string; name: string; from: string; ref: SpotifyRef }

/**
 * What to listen to: The Cavern's playlists first, then the active project's
 * Spotify references and the listener's own playlists.
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
      const list: Source[] = HOUSE_PLAYLISTS.map((p) => ({ key: `h:${p.ref.id}`, name: p.name, from: 'The Cavern', ref: p.ref }));
      const house = new Set(HOUSE_PLAYLISTS.map((p) => p.ref.id));
      for (const r of refs) {
        const ref = parseSpotifyRef(r.uri);
        if (ref) list.push({ key: `p:${r.id}`, name: r.title || 'Project reference', from: activeProject?.title ?? 'This project', ref });
      }
      for (const p of mine.filter((m) => !house.has(m.id))) list.push({ key: `m:${p.id}`, name: p.name, from: 'Your playlists', ref: { kind: 'playlist', id: p.id } });
      setSources(list);
    })().catch(() => { if (on) setSources([]); });
    return () => { on = false; };
  }, [enabled, activeProject?.id, activeProject?.title]);
  return sources;
}

/**
 * Listening without Premium: Spotify's own embedded players (The Cavern's playlists, the project's saved references, the person's
 * own playlists), for an account that cannot use the in-app player. It lives on the Sound page; the corner player only links here.
 */
export function ListenWithoutPremium() {
  const { isAuthenticated, useIframeFallback } = useSpotify();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const sources = useListeningSources(isAuthenticated && useIframeFallback);
  const active = sources?.find((x) => x.key === activeKey) ?? sources?.[0] ?? null;
  return (
    <div style={{ padding: '0 16px 16px' }}>
      {sources === null ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', padding: '12px 0' }}>Loading…</div>
      ) : sources.length === 0 ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.6, color: 'var(--fg-muted)', padding: '8px 0 12px' }}>
          Nothing to play yet. Add Spotify links to the project’s sound (Sound › Project, or the editor’s Audio panel), or make a playlist on Spotify — they show up here.
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
                    fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)',
                    textTransform: 'var(--caps)', cursor: 'pointer',
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
    </div>
  );
}
