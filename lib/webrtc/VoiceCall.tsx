'use client';
// The voice call, held above the pages. It used to live inside the Lounge page's room view, so leaving the
// Lounge ended the call; here it belongs to the suite, so a call carries on while you work and the island can
// hold it (lib/island/callActivity.ts). The Lounge's room is now a view of this, not the owner of the call.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useCurrentUser } from '@/lib/os/hooks';
import { useOnChange } from '@/lib/hooks/useOnChange';
import { useToast } from '@/components/ui/Toast';
import { useVoiceRoom, type VoicePeer } from './voice';
import { VOICE_ROOM_FULL_MESSAGE } from './mesh';

export interface CallMember { id: string; name: string; avatar?: string }
export interface CallChannel { id: string; name: string }

export interface VoiceCall {
  /** The room we are in or joining, or null. */
  channel: CallChannel | null;
  peers: VoicePeer[];
  muted: boolean;
  /** We hold a seat in the room (connected), not just asking for one. */
  live: boolean;
  speaking: boolean;
  micError: string | null;
  /** The room that turned us away because it was full, until we try again. */
  fullFor: string | null;
  join: (channel: CallChannel, me: CallMember) => void;
  leave: () => void;
  toggleMute: () => void;
}

const Ctx = createContext<VoiceCall | null>(null);

export function VoiceCallProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [active, setActive] = useState<{ channel: CallChannel; me: CallMember } | null>(null);
  const [fullFor, setFullFor] = useState<string | null>(null);

  // A call belongs to the person who made it: signing out, or another person signing in, ends it.
  useOnChange(user?.id ?? null, () => { setActive(null); setFullFor(null); });

  const room = useVoiceRoom(active?.channel.id ?? '', active?.me ?? null, active !== null, () => {
    setFullFor(active?.channel.id ?? null);
    setActive(null);
    toast(VOICE_ROOM_FULL_MESSAGE, 'error');
  });

  const join = useCallback((channel: CallChannel, me: CallMember) => { setFullFor(null); setActive({ channel, me }); }, []);
  const leave = useCallback(() => setActive(null), []);

  const value = useMemo<VoiceCall>(() => ({
    channel: active?.channel ?? null,
    peers: room.peers, muted: room.muted, live: room.live, speaking: room.speaking, micError: room.micError,
    fullFor, join, leave, toggleMute: room.toggleMute,
  }), [active, room.peers, room.muted, room.live, room.speaking, room.micError, room.toggleMute, fullFor, join, leave]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const NO_CALL: VoiceCall = {
  channel: null, peers: [], muted: false, live: false, speaking: false, micError: null, fullFor: null,
  join: () => {}, leave: () => {}, toggleMute: () => {},
};

/** The suite's voice call. Outside the provider (a test, a page rendered alone) there is simply no call. */
export function useVoiceCall(): VoiceCall {
  return useContext(Ctx) ?? NO_CALL;
}
