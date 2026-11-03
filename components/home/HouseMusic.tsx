'use client';

// The Cavern's own playlists, playable where you are, with Spotify's own player right here. It opens on Solitude
// (DEFAULT_HOUSE_PLAYLIST); pick another and the player swaps. The frame is lazy, so Spotify is not asked for anything until
// the card scrolls into view. The playlists are the house list in lib/spotify/house.ts, the same ones that head the global
// player, so there is one list to keep.

import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { DEFAULT_HOUSE_PLAYLIST, HOUSE_PLAYLISTS } from '@/lib/spotify/house';
import { spotifyEmbedSrc } from '@/lib/spotify/refs';
import m from './home.module.css';

export function HouseMusic() {
  const [picked, setPicked] = useState<string | null>(null);
  const current = HOUSE_PLAYLISTS.find((p) => p.ref.id === picked) ?? HOUSE_PLAYLISTS.find((p) => p.name === DEFAULT_HOUSE_PLAYLIST) ?? HOUSE_PLAYLISTS[0] ?? null;
  if (!HOUSE_PLAYLISTS.length) return null;
  return (
    <div className={m.music}>
      <p className={m.note}>
        The Cavern’s own playlists, from the Misfits Cavern Spotify account. It plays here, with Spotify’s own player: signed in to Spotify in this browser you get full tracks, otherwise a preview of each.
      </p>
      <div className={m.picks} role="group" aria-label="Playlists">
        {HOUSE_PLAYLISTS.map((p) => (
          <button
            key={p.ref.id}
            type="button"
            className={`${m.pick} ${current?.ref.id === p.ref.id ? m.pickOn : ''}`}
            aria-pressed={current?.ref.id === p.ref.id}
            onClick={() => setPicked(p.ref.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
      {current && (
        <>
          <iframe
            key={current.ref.id}
            className={m.frame}
            src={spotifyEmbedSrc(current.ref)}
            width="100%"
            height={current.ref.kind === 'track' || current.ref.kind === 'episode' ? 152 : 352}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title={`Spotify player: ${current.name}`}
          />
          <a className={m.open} href={`https://open.spotify.com/${current.ref.kind}/${current.ref.id}`} target="_blank" rel="noopener noreferrer">
            Open “{current.name}” in Spotify <ExternalLink size={12} aria-hidden />
          </a>
        </>
      )}
    </div>
  );
}
