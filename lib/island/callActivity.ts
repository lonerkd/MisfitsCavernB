// What the island says while you are in a voice call: the room, who is in it, and Mute / Leave under your
// thumb, on every page. Pure: the call's state in, an activity out (the same shape as syncActivity).
import type { VoiceCall } from '@/lib/webrtc/VoiceCall';
import type { Activity } from './activities';

const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

export function callActivity(call: Pick<VoiceCall, 'channel' | 'peers' | 'muted' | 'live' | 'micError' | 'toggleMute' | 'leave'>): Activity | null {
  if (!call.channel) return null;
  const name = call.channel.name;
  const leave = { id: 'leave', label: 'Leave', run: call.leave };
  const mute = { id: 'mute', label: call.muted ? 'Unmute' : 'Mute', run: call.toggleMute };

  if (call.micError) return { id: 'call', kind: 'call', tone: 'error', title: `Can’t use the microphone in ${name}`, detail: call.micError, controls: [leave] };
  if (!call.live) return { id: 'call', kind: 'call', tone: 'busy', title: `Joining ${name}…`, controls: [leave] };

  const here = call.peers.length + 1;
  const connecting = call.peers.some((p) => !p.connected);
  const detail = [people(here), connecting ? 'connecting…' : '', call.muted ? 'muted' : ''].filter(Boolean).join(' · ');
  return { id: 'call', kind: 'call', tone: call.muted ? 'warn' : 'info', title: `In voice · ${name}`, detail, controls: [mute, leave] };
}
