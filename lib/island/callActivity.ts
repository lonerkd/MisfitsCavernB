// What the island says while you are in a voice call: the room, who is in it and who is speaking, and Mute,
// Room (back to the call's room; offered anywhere but the Lounge) and Leave under your thumb, on every page. Pure: the call's state in, an activity out (the same shape as syncActivity).
import type { VoiceCall } from '@/lib/webrtc/VoiceCall';
import type { Activity } from './activities';

const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

/** Who is talking right now, short enough for the island: "Ana speaking", "Ana and Ben speaking", "Ana, Ben +1 speaking", "you're speaking". */
export function whoSpeaks(call: Pick<VoiceCall, 'peers' | 'muted' | 'speaking'>): string {
  const you = call.speaking && !call.muted;
  const others = call.peers.filter((p) => p.speaking).map((p) => p.name).filter(Boolean);
  if (!others.length) return you ? 'you\u2019re speaking' : '';
  const names = [...others, ...(you ? ['you'] : [])];
  const shown = names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(' and ');
  return `${shown} speaking`;
}

/** `openRoom`: a way back to the room, offered when the person is somewhere else (the caller decides where that is). */
export function callActivity(call: Pick<VoiceCall, 'channel' | 'peers' | 'muted' | 'speaking' | 'live' | 'micError' | 'toggleMute' | 'leave'>, openRoom?: () => void): Activity | null {
  if (!call.channel) return null;
  const name = call.channel.name;
  const leave = { id: 'leave', label: 'Leave', run: call.leave };
  const mute = { id: 'mute', label: call.muted ? 'Unmute' : 'Mute', run: call.toggleMute };

  if (call.micError) return { id: 'call', kind: 'call', tone: 'error', title: `Can’t use the microphone in ${name}`, detail: call.micError, controls: [leave] };
  if (!call.live) return { id: 'call', kind: 'call', tone: 'busy', title: `Joining ${name}…`, controls: [leave] };

  const here = call.peers.length + 1;
  const connecting = call.peers.some((p) => !p.connected);
  const detail = [people(here), connecting ? 'connecting…' : '', call.muted ? 'muted' : '', whoSpeaks(call)].filter(Boolean).join(' · ');
  const room = openRoom ? [{ id: 'room', label: 'Room', run: openRoom }] : [];
  return { id: 'call', kind: 'call', tone: call.muted ? 'warn' : 'info', title: `In voice · ${name}`, detail, controls: [mute, ...room, leave] };
}
