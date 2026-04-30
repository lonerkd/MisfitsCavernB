'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Music, Users, Smile, Hash, Lock, Bell, Search, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import { supabase } from '@/lib/supabase/client';
import { getChannelMessages, sendMessage, subscribeToChannel } from '@/lib/supabase/messages';
import { useProject } from '@/lib/context/ProjectContext';
import { Headphones, Disc, Radio, ExternalLink } from 'lucide-react';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
  sender_id?: string;
  mine?: boolean;
}

const SEED_MESSAGES: Message[] = [
  {
    id: '1',
    user: 'Peter',
    text: 'Working on the final edit for 10 Million. The timing is sitting perfectly.',
    timestamp: new Date('2026-04-27T01:30:00'),
  },
  {
    id: '2',
    user: 'Creative',
    text: "Can't wait to see it. The rough cut was incredible — every cut felt intentional.",
    timestamp: new Date('2026-04-27T01:32:00'),
  },
  {
    id: '3',
    user: 'Peter',
    text: 'Starting on the Femme Fatale pitch deck next. Need to get it submission-ready.',
    timestamp: new Date('2026-04-27T01:35:00'),
  },
];

const CREW = [
  { name: 'Peter Olowude', role: 'Director / DP', online: true, activity: 'Writing ScriptOS' },
  { name: 'Creative Director', role: 'Art Direction', online: true, activity: 'Building Moodboard' },
  { name: 'Producer', role: 'Production', online: false, activity: 'Idle' },
];

function MessageBubble({ msg, currentUserId }: { msg: Message, currentUserId?: string }) {
  const isMe = msg.mine || (msg.sender_id && msg.sender_id === currentUserId);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        marginBottom: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start',
      }}
    >
      {!isMe && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 13, letterSpacing: 2, color: 'var(--accent)' }}>
            {msg.user}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-subtle)' }}>
            {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
      <div style={{
        maxWidth: '75%',
        padding: '12px 16px',
        background: isMe ? 'rgba(255,60,0,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isMe ? 'rgba(255,60,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
      }}>
        <p style={{
          fontFamily: 'var(--serif)',
          fontSize: 14,
          lineHeight: 1.65,
          color: 'rgba(240,236,228,0.85)',
          margin: 0,
        }}>
          {msg.text}
        </p>
      </div>
      {isMe && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-subtle)', marginTop: 4 }}>
          {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </motion.div>
  );
}

export default function LoungePage() {
  const { activeProject, projects, setActiveProject } = useProject();
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState<Message[]>(SEED_MESSAGES);
  const [input, setInput] = useState('');
  const [nowPlaying, setNowPlaying] = useState({ title: 'Resonance', artist: 'HOME', album: 'Odyssey' });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [crewList, setCrewList] = useState<any[]>(CREW);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && mounted) setCurrentUser(user);
    });

    supabase.from('profiles').select('*').limit(20).then(({ data }) => {
      if (data && mounted) {
        setCrewList(data.map(p => ({
          id: p.id,
          name: p.username || 'User',
          role: p.role || 'Crew',
          online: p.status === 'OPEN'
        })));
      }
    });

    const loadMessages = async () => {
      try {
        const data = await getChannelMessages(activeChannel);
        if (!mounted) return;
        const formatted = data.map((m: any) => ({
          id: m.id,
          user: m.profiles?.username || 'Unknown',
          text: m.content,
          timestamp: new Date(m.created_at),
          sender_id: m.sender_id
        }));
        setMessages(formatted);
      } catch (e) {
        console.error(e);
      }
    };
    loadMessages();

    const channel = subscribeToChannel(activeChannel, () => {
      loadMessages();
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeChannel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !currentUser) return;
    setInput('');
    try {
      await sendMessage(currentUser.id, text, activeChannel);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main style={{ background: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <GrainOverlay />

      {/* Header */}
      <nav style={{
        position: 'sticky',
        top: 0,
        padding: '0 28px',
        height: 62,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 100,
        background: 'rgba(8,8,8,0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.6')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <ArrowLeft size={17} color="var(--fg)" />
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.05rem', letterSpacing: 6 }}>LOUNGE</div>
        </Link>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {/* Project Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: activeProject?.accent_color || 'var(--accent)' }} />
            <select 
              value={activeProject?.id || ''} 
              onChange={(e) => {
                const p = projects.find(p => p.id === e.target.value);
                if (p) setActiveProject(p);
              }}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 10, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#111' }}>{p.title}</option>)}
            </select>
          </div>

          {/* Now playing */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 14px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 'var(--radius-full)',
            maxWidth: 300,
            overflow: 'hidden',
          }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}>
              <Disc size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            </motion.div>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1,
              color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {nowPlaying.title} · {nowPlaying.artist}
            </span>
          </div>
        </div>
      </nav>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Channel Sidebar (Slack-style) */}
        <div style={{
          width: 220,
          background: '#0a0a0a',
          borderRight: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <div style={{ padding: '20px 16px' }}>
             <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Channels</div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
               {[
                 { id: 'general', name: 'general', icon: Hash },
                 { id: 'script-notes', name: 'script-notes', icon: Hash },
                 { id: 'production', name: 'production', icon: Lock },
                 { id: 'dailies', name: 'dailies', icon: Hash },
                 { id: 'legal', name: 'legal', icon: Lock },
               ].map(ch => {
                 const Icon = ch.icon;
                 const isActive = activeChannel === ch.id;
                 return (
                   <button 
                     key={ch.id}
                     onClick={() => setActiveChannel(ch.id)}
                     style={{
                       display: 'flex', alignItems: 'center', gap: 8,
                       padding: '6px 10px', borderRadius: 4,
                       background: isActive ? 'rgba(255,60,0,0.1)' : 'transparent',
                       border: 'none', color: isActive ? '#fff' : '#888',
                       cursor: 'pointer', transition: 'all 0.2s',
                       fontFamily: 'var(--mono)', fontSize: 11
                     }}
                   >
                     <Icon size={12} color={isActive ? 'var(--accent)' : '#666'} />
                     {ch.name}
                   </button>
                 );
               })}
             </div>
          </div>
          
          <div style={{ marginTop: 'auto', padding: 20, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>P</div>
                <div style={{ flex: 1 }}>
                   <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Peter O.</div>
                   <div style={{ fontSize: 9, color: '#00cc66' }}>● Online</div>
                </div>
                <SettingsIcon size={14} color="#666" style={{ cursor: 'pointer' }} />
             </div>
          </div>
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Channel Header */}
          <div style={{ padding: '12px 32px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>#{activeChannel}</span>
               <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
               <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>4 members</span>
             </div>
             <div style={{ display: 'flex', gap: 16 }}>
                <Search size={14} color="#666" />
                <Bell size={14} color="#666" />
                <Users size={14} color="#666" />
             </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#444', marginTop: 100, fontFamily: 'var(--mono)', fontSize: 10 }}>
                  NO MESSAGES IN #{activeChannel.toUpperCase()} YET
                </div>
              ) : messages.map(msg => <MessageBubble key={msg.id} msg={msg} currentUserId={currentUser?.id} />)}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div style={{
            padding: '16px 28px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            background: '#090909',
            flexShrink: 0,
          }}>
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <button style={{
                background: 'none', border: 'none', color: 'var(--fg-muted)',
                padding: 10, alignSelf: 'center', transition: 'color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-muted)')}>
                <Smile size={16} />
              </button>

              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={`Message #${activeChannel}...`}
                rows={1}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--fg)',
                  fontFamily: 'var(--serif)',
                  fontSize: 14,
                  resize: 'none',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  lineHeight: 1.5,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,60,0,0.35)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />

              <motion.button
                onClick={handleSend}
                whileHover={input.trim() ? { scale: 1.05 } : {}}
                whileTap={input.trim() ? { scale: 0.95 } : {}}
                style={{
                  padding: '11px 18px',
                  background: input.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: input.trim() ? 'var(--bg)' : 'var(--fg-muted)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2,
                  textTransform: 'uppercase',
                  transition: 'background 0.3s, color 0.3s',
                  alignSelf: 'flex-end',
                }}
              >
                <Send size={12} /> Send
              </motion.button>
            </div>
          </div>
        </div>

        {/* Crew sidebar */}
        <div style={{
          width: 240,
          borderLeft: '1px solid rgba(255,255,255,0.04)',
          background: '#090909',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          flexShrink: 0,
          overflowY: 'auto',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 12 }}>
            Crew
          </div>

          {crewList.map((member, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                padding: '10px 12px',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: member.online ? 'rgba(0,204,102,0.03)' : 'transparent',
              }}
            >
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: member.online ? '#00cc66' : '#333',
                boxShadow: member.online ? '0 0 10px rgba(0,204,102,0.8)' : 'none',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.3, color: member.online ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: 600 }}>
                    {member.name}
                  </div>
                  {member.online && (
                    <div style={{ fontSize: 7, color: 'var(--accent)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Live</div>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1, color: 'var(--fg-subtle)', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{member.role}</span>
                  {member.online && <span style={{ fontStyle: 'italic', color: '#888' }}>{member.activity}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        textarea::placeholder { color: rgba(240,236,228,0.18); }
      `}</style>
    </main>
  );
}
