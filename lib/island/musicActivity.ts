// What the island says while music is on: the track and who plays it, how far along it is, and Pause / Play and
// Next under your thumb, on every page. Pure: the player's state in, an activity out (as syncActivity and
// callActivity are). Music ranks lowest of the activities, so a call, an upload or a sprint is shown first and
// the music is one tap away behind the "+N".
import type { Activity } from './activities';

export interface MusicState {
  isAuthenticated: boolean;
  currentTrack: { name: string; artists: { name: string }[] } | null;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  togglePlay: () => void;
  nextTrack: () => void;
}

/** The bar moves in whole percent: a finer one would republish the island several times a second for nothing a person can see. */
export const quantize = (fraction: number): number => Math.round(Math.min(1, Math.max(0, fraction)) * 100) / 100;

/**
 * `held`: the music has been playing lately. A track left paused for a long time is not "running" any more, and
 * the island should go back to showing where you are rather than hold a paused song for the rest of the session.
 */
export function musicActivity(m: MusicState, held: boolean): Activity | null {
  if (!m.isAuthenticated || !m.currentTrack) return null;
  if (!m.isPlaying && !held) return null;
  const artists = m.currentTrack.artists.map((a) => a.name).filter(Boolean).join(', ');
  return {
    id: 'music',
    kind: 'music',
    tone: m.isPlaying ? 'info' : 'warn',
    title: m.currentTrack.name || 'Playing',
    detail: [artists, m.isPlaying ? '' : 'paused'].filter(Boolean).join(' · ') || undefined,
    progress: m.durationMs > 0 ? quantize(m.progressMs / m.durationMs) : undefined,
    controls: [
      { id: 'toggle', label: m.isPlaying ? 'Pause' : 'Play', run: m.togglePlay },
      { id: 'next', label: 'Next', run: m.nextTrack },
    ],
  };
}

/** How long a paused track stays on the island. */
export const PAUSED_HOLD_MS = 120_000;
