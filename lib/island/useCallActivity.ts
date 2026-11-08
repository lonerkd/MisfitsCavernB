'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useVoiceCall } from '@/lib/webrtc/VoiceCall';
import { useActivity } from './activities';
import { callActivity } from './callActivity';
import { useHeldSpeakers } from './useHeldSpeakers';

/** Holds the voice call on the island for as long as there is one, on every page. */
export function useCallActivity(): void {
  const call = useVoiceCall();
  const router = useRouter();
  const pathname = usePathname();
  // A way back to the room, offered anywhere but the Lounge itself (the Lounge's own room view is right there).
  const channelId = call.channel?.id;
  const openRoom = channelId && !pathname.startsWith('/lounge') ? () => router.push(`/lounge?channel=${channelId}`) : undefined;
  // Who is speaking, steadied: held a moment after they last sounded, so the line does not flicker between words.
  const heard = useHeldSpeakers([...(call.speaking && !call.muted ? ['you'] : []), ...call.peers.filter((p) => p.speaking).map((p) => p.id)]);
  const steady = { ...call, speaking: heard.has('you'), peers: call.peers.map((p) => ({ ...p, speaking: heard.has(p.id) })) };
  useActivity(callActivity(steady, openRoom));
}
