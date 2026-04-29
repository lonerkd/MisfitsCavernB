'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Smile, Hash } from 'lucide-react';
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
  profiles?: { username: string; avatar_url?: string };
}

function Avatar({ username, avatar_url, size = 32 }: { username: string; avatar_url?: string; size?: number }) {
  if (avatar_url) {
    return <img src={avatar_url} alt={username} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--display)', fontSize: size * 0.4, color: 'var(--bg)', flexShrink: 0,
    }}>
      {username[0]?.toUpperCase() || '?'}
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric' });
}

export default function LoungePage() {
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [profileUsername, setProfileUsername] = useState('');
  const [emojiPicker, setEmojiPicker] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        filter: `channel_id=eq.${channel.id}`,
      }, (payload) => fetchAndAppend(payload.new.id))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `channel_id=eq.${channel.id}`,
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, reactions: payload.new.reactions } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [channel.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*, profiles!messages_sender_id_fkey(username, avatar_url)')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setMessages(data as Message[]);
    setLoading(false);
  };

  const fetchAndAppend = async (id: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles!messages_sender_id_fkey(username, avatar_url)')
      .eq('id', id).single();
    if (data) setMessages(prev => [...prev, data as Message]);
  };

  const send = async () => {
    const text = newMessage.trim();
    if (!user || !text) return;
    setNewMessage('');
    await supabase.from('messages').insert({
      sender_id: user.id,
      channel_id: channel.id,
      content: text,
      reactions: {},
    });
    inputRef.current?.focus();
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

  // Group messages: consecutive messages from same sender within 5 minutes
  const grouped = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const isGrouped = prev &&
      prev.sender_id === msg.sender_id &&
      new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
    const showDate = !prev || formatDate(msg.created_at) !== formatDate(prev.created_at);
    return { msg, isGrouped, showDate };
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex' }}>
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 60,
        background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '0 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', zIndex: 100,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>LOUNGE</h1>
        </Link>
        {profileUsername
          ? <span style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.5 }}>{profileUsername}</span>
          : <Link href="/auth" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', textDecoration: 'none' }}>Sign in to chat →</Link>
        }
      </header>

      <div style={{ marginTop: 60, display: 'flex', width: '100%', height: 'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: '#080808', borderRight: '1px solid rgba(255,255,255,0.04)', padding: '20px 12px', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, opacity: 0.3, marginBottom: 12, paddingLeft: 8 }}>CHANNELS</div>
          {CHANNELS.map(ch => (
            <button key={ch.id} onClick={() => setChannel(ch)}
              style={{
                width: '100%', padding: '10px 12px', marginBottom: 2,
                background: channel.id === ch.id ? 'rgba(255,60,0,0.1)' : 'transparent',
                border: 'none',
                borderLeft: `2px solid ${channel.id === ch.id ? 'var(--accent)' : 'transparent'}`,
                color: channel.id === ch.id ? 'var(--fg)' : 'rgba(255,255,255,0.45)',
                fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { if (channel.id !== ch.id) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
              onMouseLeave={e => { if (channel.id !== ch.id) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; }}>
              <Hash size={11} style={{ opacity: 0.5 }} />
              {ch.name}
            </button>
          ))}

          {!user && (
            <div style={{ paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 24 }}>
              <Link href="/auth"
                style={{ display: 'block', padding: '8px 12px', background: 'rgba(255,60,0,0.1)', border: '1px solid rgba(255,60,0,0.3)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, textDecoration: 'none', textAlign: 'center' }}>
                SIGN IN TO CHAT
              </Link>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Channel header */}
          <div style={{ height: 48, borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.01)', flexShrink: 0 }}>
            <Hash size={14} style={{ opacity: 0.4 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 'bold' }}>{channel.name}</span>
            <span style={{ fontSize: 10, opacity: 0.35, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 12 }}>{channel.description}</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, opacity: 0.3, fontFamily: 'var(--mono)', fontSize: 11 }}>Loading messages...</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, opacity: 0.3 }}>
                <Hash size={32} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>No messages yet. Be the first.</div>
              </div>
            ) : (
              <div style={{ maxWidth: 860 }}>
                {grouped.map(({ msg, isGrouped, showDate }) => (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 16px' }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                        <span style={{ fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: 2, opacity: 0.4 }}>{formatDate(msg.created_at)}</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, marginBottom: isGrouped ? 2 : 16, paddingLeft: isGrouped ? 44 : 0 }}>
                      {!isGrouped && (
                        <div style={{ flexShrink: 0, marginTop: 2 }}>
                          <Avatar username={msg.profiles?.username || '?'} avatar_url={msg.profiles?.avatar_url} size={32} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {!isGrouped && (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 'bold', color: 'var(--accent)' }}>
                              {msg.profiles?.username || 'anonymous'}
                            </span>
                            <span style={{ fontSize: 9, opacity: 0.3, fontFamily: 'var(--mono)' }}>
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.88)', wordBreak: 'break-word' }}>
                          {msg.content}
                        </div>
                        {/* Reactions */}
                        {(Object.keys(msg.reactions || {}).length > 0 || user) && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                            {Object.entries(msg.reactions || {}).map(([emoji, reactors]) => (
                              reactors.length > 0 && (
                                <button key={emoji} onClick={() => react(msg.id, emoji)}
                                  style={{ padding: '2px 8px', background: user && reactors.includes(user.id) ? 'rgba(255,60,0,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${user && reactors.includes(user.id) ? 'rgba(255,60,0,0.5)' : 'rgba(255,255,255,0.1)'}`, color: 'var(--fg)', cursor: user ? 'pointer' : 'default', fontSize: 11, borderRadius: 2 }}>
                                  {emoji} {reactors.length}
                                </button>
                              )
                            ))}
                            {user && (
                              <div style={{ position: 'relative' }}>
                                <button onClick={() => setEmojiPicker(emojiPicker === msg.id ? null : msg.id)}
                                  style={{ padding: '2px 6px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', borderRadius: 2, display: 'flex', alignItems: 'center' }}
                                  title="Add reaction">
                                  <Smile size={11} />
                                </button>
                                {emojiPicker === msg.id && (
                                  <div style={{ position: 'absolute', bottom: 28, left: 0, background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: 8, display: 'flex', gap: 4, zIndex: 50 }}>
                                    {EMOJIS.map(e => (
                                      <button key={e} onClick={() => react(msg.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, borderRadius: 4, transition: 'background 0.1s' }}
                                        onMouseEnter={e2 => (e2.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
                                        onMouseLeave={e2 => (e2.currentTarget as HTMLElement).style.background = 'none'}>
                                        {e}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: '12px 24px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', background: '#080808', flexShrink: 0 }}>
            {user ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 4px 4px 16px' }}>
                <input ref={inputRef} type="text" value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={`Message #${channel.name}...`}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 12, outline: 'none' }} />
                <button onClick={send} disabled={!newMessage.trim()}
                  style={{ padding: '10px 16px', background: newMessage.trim() ? 'var(--accent)' : 'rgba(255,60,0,0.2)', border: 'none', color: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, cursor: newMessage.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s' }}>
                  <Send size={11} /> SEND
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 14, fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.5 }}>
                <Link href="/auth" style={{ color: 'var(--accent)' }}>Sign in</Link> to join the conversation
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
