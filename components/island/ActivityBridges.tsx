'use client';
import { useSyncActivity } from '@/lib/island/useSyncActivity';
import { useCallActivity } from '@/lib/island/useCallActivity';
import { useMusicActivity } from '@/lib/island/useMusicActivity';

/**
 * What is running (the offline queue, a voice call, the music) is held on the island by hooks that watch things
 * which change often: a track's progress moves every second, a call's speaking ring several times a second, a
 * retry countdown every second. Each is subscribed here, in a component that renders nothing, so those changes
 * re-render this and not the whole island. The island itself re-renders only when what is held actually changes
 * (the activity store).
 */
export function ActivityBridges(): null {
  useSyncActivity();
  useCallActivity();
  useMusicActivity();
  return null;
}
