'use client';

import { Volume2, Mic, MicOff } from 'lucide-react';
import { type Channel } from '@/lib/supabase/channels';
import { useVoiceCall } from '@/lib/webrtc/VoiceCall';
import Avatar from '@/components/ui/Avatar';
import { VOICE_ROOM_FULL_MESSAGE } from '@/lib/webrtc/mesh';

export function VoiceRoom({ channel, me }: { channel: Channel; me: { id: string; name: string; avatar?: string } | null }) {
  // The call belongs to the suite, not to this page: it carries on when you leave the Lounge (and the island holds
  // it). This room is a view of it, for the channel you are looking at.
  const call = useVoiceCall();
  const joined = call.channel?.id === channel.id;
  const elsewhere = call.channel && !joined ? call.channel.name : null;
  const full = call.fullFor === channel.id;
  const { peers, muted, toggleMute, micError, speaking, live } = joined
    ? call
    : { peers: [], muted: false, toggleMute: call.toggleMute, micError: null, speaking: false, live: false };

  const everyone = joined && live && me ? [{ id: me.id, name: me.name, avatar: me.avatar, speaking, connected: true }, ...peers] : peers;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--display)', fontSize: '1.8rem', letterSpacing: '-0.02em' }}>
        <Volume2 size={24} color="var(--accent)" /> {channel.name}
      </div>
      {everyone.length > 0 ? (
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
          {everyone.map(m => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ border: `2px solid ${m.speaking ? '#10b981' : 'rgba(var(--ink-rgb), 0.15)'}`, borderRadius: '50%', boxShadow: m.speaking ? '0 0 18px rgba(16,185,129,0.6)' : 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}>
                <Avatar src={m.avatar} name={m.name} size={56} />
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                {m.name}{m.id === me?.id ? ' (you)' : ''}
                {m.id !== me?.id && !m.connected && <span style={{ color: 'var(--warn)' }}> · connecting…</span>}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)' }}>{joined ? (live ? 'Waiting for others to join…' : 'Connecting…') : 'No one here yet'}</div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={() => { if (joined) call.leave(); else if (me) call.join({ id: channel.id, name: channel.name }, me); }} style={{ padding: '12px 28px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', fontWeight: 600, background: joined ? 'rgba(232, 67, 26,0.15)' : '#10b981', color: joined ? '#ff7a4d' : '#031a12', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Volume2 size={14} /> {joined ? 'LEAVE VOICE' : elsewhere ? `MOVE HERE FROM ${elsewhere.toUpperCase()}` : 'JOIN VOICE'}
        </button>
        {joined && (
          <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'} style={{ padding: 12, borderRadius: '50%', border: `1px solid ${muted ? 'rgba(232, 67, 26,0.5)' : 'rgba(var(--ink-rgb), 0.15)'}`, cursor: 'pointer', background: muted ? 'rgba(232, 67, 26,0.15)' : 'rgba(var(--ink-rgb), 0.05)', color: muted ? 'var(--accent)' : 'var(--fg-strong)', display: 'flex' }}>
            {muted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
      </div>
      <div role={full ? 'alert' : undefined} style={{ fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: full || micError ? 'var(--warn)' : 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
        {full ? VOICE_ROOM_FULL_MESSAGE : micError || (joined ? (live ? 'Live — peer-to-peer audio with your crew. Green ring = speaking. The call carries on while you use the rest of the suite.' : 'Connecting…') : elsewhere ? `You are in a call in ${elsewhere}. Moving here leaves that one.` : 'Join to talk with everyone in this room.')}
      </div>
    </div>
  );
}
