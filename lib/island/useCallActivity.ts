'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useVoiceCall } from '@/lib/webrtc/VoiceCall';
import { useActivity } from './activities';
import { callActivity } from './callActivity';

/** Holds the voice call on the island for as long as there is one, on every page. */
export function useCallActivity(): void {
  const call = useVoiceCall();
  const router = useRouter();
  const pathname = usePathname();
  // A way back to the room, offered anywhere but the Lounge itself (the Lounge's own room view is right there).
  const channelId = call.channel?.id;
  const openRoom = channelId && !pathname.startsWith('/lounge') ? () => router.push(`/lounge?channel=${channelId}`) : undefined;
  useActivity(callActivity(call, openRoom));
}
