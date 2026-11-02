'use client';
import { useEffect, useState } from 'react';

/** How long someone stays "speaking" on the island after they last sounded: a pause between words is not stopping. */
export const SPEAKER_HOLD_MS = 900;

/**
 * The speaking meter (lib/webrtc/voice.ts) samples every 120 ms against one threshold, so a person speaking
 * normally flips between loud and quiet several times a second. Shown as it comes, the island's speaker line
 * would flicker. This keeps each speaker on for SPEAKER_HOLD_MS after the last moment they were heard; people
 * speaking now are always included immediately (no lag on the way in, only on the way out).
 */
export function useHeldSpeakers(speakingNow: readonly string[], holdMs = SPEAKER_HOLD_MS): Set<string> {
  const key = speakingNow.join('\u0000');
  const [lingering, setLingering] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const now = new Set(key ? key.split('\u0000') : []);
    // Remember everyone heard now (so they are still shown when they go quiet), then, a hold later, let go of
    // whoever has not been heard since. Any new change in who is speaking restarts the hold.
    const remember = setTimeout(() => setLingering((before) => new Set([...before, ...now])), 0);
    const forget = setTimeout(() => setLingering(now), holdMs);
    return () => { clearTimeout(remember); clearTimeout(forget); };
  }, [key, holdMs]);

  return new Set([...lingering, ...speakingNow]);
}
