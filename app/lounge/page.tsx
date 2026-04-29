'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Smile } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

const CHANNELS = [
  { id: 'general', name: 'general', description: 'Open discussion' },
  { id: 'writing-room', name: 'writing-room', description: 'Scripts, ideas, feedback' },
  { id: 'music', name: 'music', description: 'Score, sound design' },
  { id: 'feedback', name: 'feedback', description: 'Show your work' },
];

const EMOJIS = ['👍', '❤️', '🔥', '👀', '😂', '🎉'];

interface Message {
  id: string;
  sender_id: string;
  channel_id: string;
  content: string;
  reactions: Record<string, string[]>;
  created_at: string;
  profiles?: { username: string };
}

export default function LoungePage() {
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [profileUsername, setProfileUsername] = useState('');
  const [emojiPicker, setEmojiPicker] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single();
        if (data) setProfileUsername(data.username);
      }
    });
  }, []);

  useEffect(() => {
    loadMessages();
    const sub = supabase
      .channel(`lounge-${channel.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `channel_id=eq.${channel.id}`
      }, (payload) => fetchAndAppend(payload.new.id))
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [channel.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles!messages_sender_id_fkey(username)')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setMessages(data as Message[]);
  };

  const fetchAndAppend = async (id: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles!messages_sender_id_fkey(username)')
      .eq('id', id).single();
    if (data) setMessages(prev => [...prev, data as Message]);
  };

  const send = async () => {
    if (!user || !newMessage.trim()) return;
    await supabase.from('messages').insert({
      sender_id: user.id,
      channel_id: channel.id,
      content: newMessage,
      reactions: {}
    });
    setNewMessage('');
  };

  const react = async (msgId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...msg.reactions };
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(user.id);
    if (idx >= 0) reactions[emoji].splice(idx, 1);
    else reactions[emoji].push(user.id);
    if (reactions[emoji].length === 0) delete reactions[emoji];
    await supabase.from('messages').update({ reactions }).eq('id', msgId);
    setMessages(messages.map(m => m.id === msgId ? { ...m, reactions } : m));
    setEmojiPicker(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex' }}>
      <header style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: 60, background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>LOUNGE</h1>
        </Link>
        {profileUsername
          ? <span style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.5 }}>{profileUsername}</span>
          : <Link href="/auth" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)' }}>Sign in to chat</Link>}
      </header>

      <div style={{ marginTop: 60, display: 'flex', width: '100%', height: 'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <div style={{ width: 200, background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.04)', padding: 16 }}>
          <h3 style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, marginBottom: 16, opacity: 0.5 }}>CHANNELS</h3>
          {CHANNELS.map(ch => (
            <button key={ch.id} onClick={() => setChannel(ch)}
              style={{ width: '100%', padding: 12, marginBottom: 8, background: channel.id === ch.id ? 'rgba(255,60,0,0.1)' : 'transparent', border: `1px solid ${channel.id === ch.id ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (channel.id !== ch.id) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onMouseLeave={e => { if (channel.id !== ch.id) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
              <div># {ch.name}</div>
              <div style={{ fontSize: 9, opacity: 0.4, marginTop: 2 }}>{ch.description}</div>
            </button>
          ))}
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 40, borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}># {channel.name}</span>
            <span style={{ fontSize: 9, opacity: 0.4 }}>{channel.description}</span>
          </div>

          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            <div style={{ maxWidth: 900 }}>
              {messages.map(msg => (
                <div key={msg.id} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--display)', fontSize: 13, letterSpacing: 1, color: 'var(--accent)' }}>
                      {msg.profiles?.username || 'anonymous'}
                    </span>
                    <span style={{ fontSize: 9, opacity: 0.4 }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.9, marginBottom: 6 }}>{msg.content}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {Object.entries(msg.reactions || {}).map(([emoji, reactors]) => (
                      <button key={emoji} onClick={() => react(msg.id, emoji)}
                        style={{ padding: '2px 8px', background: user && reactors.includes(user.id) ? 'rgba(255,60,0,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${user && reactors.includes(user.id) ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, color: 'var(--fg)', cursor: 'pointer', borderRadius: 2, fontSize: 11 }}>
                        {emoji} {reactors.length}
                      </button>
                    ))}
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setEmojiPicker(emojiPicker === msg.id ? null : msg.id)}
                        style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', cursor: 'pointer', borderRadius: 2 }}>
                        <Smile size={12} />
                      </button>
                      {emojiPicker === msg.id && (
                        <div style={{ position: 'absolute', bottom: 28, left: 0, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: 8, display: 'flex', gap: 4, zIndex: 50 }}>
                          {EMOJIS.map(e => (
                            <button key={e} onClick={() => react(msg.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>{e}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.04)', background: '#0a0a0a' }}>
            {user ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder={`Message #${channel.name}...`}
                  style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, outline: 'none' }} />
                <button onClick={send}
                  style={{ padding: '12px 20px', background: 'var(--accent)', border: 'none', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Send size={12} /> SEND
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 12, fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.5 }}>
                <Link href="/auth" style={{ color: 'var(--accent)' }}>Sign in</Link> to join the conversation
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
