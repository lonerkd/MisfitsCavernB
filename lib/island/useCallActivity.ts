'use client';
import { useVoiceCall } from '@/lib/webrtc/VoiceCall';
import { useActivity } from './activities';
import { callActivity } from './callActivity';

/** Holds the voice call on the island for as long as there is one, on every page. */
export function useCallActivity(): void {
  useActivity(callActivity(useVoiceCall()));
}
