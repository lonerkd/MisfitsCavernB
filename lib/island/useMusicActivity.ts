'use client';
import { useEffect, useState } from 'react';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { useActivity } from './activities';
import { musicActivity, PAUSED_HOLD_MS } from './musicActivity';

/** Holds the music on the island while it plays, and for a couple of minutes after it is paused, on every page. */
export function useMusicActivity(): void {
  const spotify = useSpotify();
  // "Playing lately": true while playing, and for PAUSED_HOLD_MS after it stops. Not true for a session that has
  // never played anything, so signing in to Spotify alone does not take over the island.
  const [lately, setLately] = useState(false);
  const { isPlaying } = spotify;
  useEffect(() => {
    if (isPlaying) { const on = setTimeout(() => setLately(true), 0); return () => clearTimeout(on); }
    const off = setTimeout(() => setLately(false), PAUSED_HOLD_MS);
    return () => clearTimeout(off);
  }, [isPlaying]);

  useActivity(musicActivity(spotify, lately));
}
