'use client';

import { useState } from 'react';
import { Headphones } from 'lucide-react';
import { spotifyEmbedSrc, type SpotifyKind } from '@/lib/spotify/refs';

/**
 * A taste of a song without leaving the page: a Preview button that opens Spotify's own embedded player under the row (the same
 * player as open.spotify.com, so it plays a clip when the listener is not signed in to Spotify in this browser and the whole song
 * when they are). It is a separate player from the suite's: it never touches what is already playing. Spotify no longer gives
 * apps clip links in search results, so the embed is the in-app way.
 */
export function SpotifyPreview({ kind = 'track', id, label, children }: { kind?: SpotifyKind; id: string; label: string; children: (button: React.ReactNode, frame: React.ReactNode) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const button = (
    <button type="button" aria-label={`Preview ${label}`} aria-pressed={open} onClick={() => setOpen((o) => !o)}
      style={{ minWidth: 44, minHeight: 44, borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.14)', background: open ? 'rgba(var(--ink-rgb), 0.1)' : 'transparent', color: 'var(--fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 10px', fontSize: 12, cursor: 'pointer' }}>
      <Headphones size={15} /> Preview
    </button>
  );
  const frame = open ? (
    <iframe src={spotifyEmbedSrc({ kind, id })} title={`Spotify preview: ${label}`} width="100%" height={kind === 'track' || kind === 'episode' ? 80 : 152}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style={{ border: 0, borderRadius: 14, display: 'block', marginTop: 8 }} />
  ) : null;
  return <>{children(button, frame)}</>;
}
