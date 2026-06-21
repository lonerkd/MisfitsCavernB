'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Send, Music, Users, Hash, Lock, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import { supabase } from '@/lib/supabase/client';
import { getChannelMessages, sendMessage, subscribeToChannel, getDMThread, subscribeToDMs, listDMConversations } from '@/lib/supabase/messages';
import { useProject } from '@/lib/context/ProjectContext';
import { Headphones, Radio, ExternalLink } from 'lucide-react';
import SpotifyPlayer from '@/components/SpotifyPlayer';
import NotificationBell from '@/components/NotificationBell';
import MobileNavMenu from '@/components/MobileNavMenu';
import { usePillStage, usePillZone } from '@/lib/context/PillContext';
import { useRouter, useSearchParams } from 'next/navigation';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
  sender_id?: string;
  mine?: boolean;
}

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
        background: isMe ? 'rgba(215,52,11,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isMe ? 'rgba(215,52,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
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

// A crew row is its own Pill zone: hovering a member sharpens the satellite
// onto them — role + live/offline status — with a jump to their profile.
function CrewMemberRow({ member, online, delay, onMessage }: { member: any; online: boolean; delay: number; onMessage: (member: any) => void }) {
  const router = useRouter();
  const zone = useMemo(() => ({
    module: 'lounge',
    accent: '#10b981',
    title: member.name,
    fields: [
      { label: 'Role', value: member.role || 'Crew' },
      { label: 'Status', value: online ? 'Online' : 'Offline', color: online ? '#00cc66' : undefined },
    ],
    actions: member.id ? [
      { id: 'message', label: '→ Message', onClick: () => onMessage(member) },
      { id: 'profile', label: '→ Profile', onClick: () => router.push(`/crew/${member.id}`) },
    ] : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [member.id, member.name, member.role, online]);
  const zoneHandlers = usePillZone(zone, 1);

  return (
    <motion.div
      {...zoneHandlers}
      onClick={() => onMessage(member)}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      style={{
        padding: '10px 12px',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: online ? 'rgba(0,204,102,0.03)' : 'transparent',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: online ? '#00cc66' : '#333',
        boxShadow: online ? '0 0 10px rgba(0,204,102,0.8)' : 'none',
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.3, color: online ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: 600 }}>
            {member.name}
          </div>
          {online && (
            <div style={{ fontSize: 7, color: 'var(--accent)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Live</div>
          )}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1, color: 'var(--fg-subtle)', marginTop: 2 }}>
          <span>{member.role}</span>
        </div>
      </div>
    </motion.div>
  );
}

interface DMConversation {
  id: string;
  username: string;
  avatar_url?: string;
  lastMessage: string;
  lastAt: string;
}

export default function LoungePage() {
  return (
    <React.Suspense fallback={null}>
      <LoungePageInner />
    </React.Suspense>
  );
}

function LoungePageInner() {
  const { activeProject, projects, setActiveProject } = useProject();
  const [activeChannel, setActiveChannel] = useState('general');
  const [activeDM, setActiveDM] = useState<{ id: string; username: string } | null>(null);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<{ username: string; role?: string } | null>(null);
  const [crewList, setCrewList] = useState<any[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const openDM = (member: { id: string; name: string }) => {
    if (!member.id) return;
    setActiveDM({ id: member.id, username: member.name });
  };

  useEffect(() => {
    let mounted = true;
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !mounted) return;
      setCurrentUser(user);
      supabase.from('profiles').select('username, role').eq('id', user.id).single().then(({ data }) => {
        if (!data || !mounted) return;
        setCurrentProfile(data);

        presenceChannel = supabase.channel('lounge-presence', {
          config: { presence: { key: user.id } },
        });
        presenceChannel
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel!.presenceState();
            setOnlineIds(new Set(Object.keys(state)));
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              presenceChannel!.track({ username: data.username, online_at: new Date().toISOString() });
            }
          });
      });
    });

    supabase.from('profiles').select('*').limit(20).then(({ data }) => {
      if (data && mounted) {
        setCrewList(data.map(p => ({
          id: p.id,
          name: p.username || 'User',
          role: p.role || 'Crew',
        })));
      }
    });

    return () => {
      mounted = false;
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, []);

  // Deep-link support: /lounge?dm=<userId> opens a DM thread directly (used
  // by the "Message" button on Crew profiles).
  useEffect(() => {
    const dmId = searchParams?.get('dm');
    if (!dmId) return;
    supabase.from('profiles').select('id, username').eq('id', dmId).single().then(({ data }) => {
      if (data) setActiveDM({ id: data.id, username: data.username || 'User' });
    });
  }, [searchParams]);

  useEffect(() => {
    if (!currentUser) return;
    let mounted = true;
    const loadConversations = () => {
      listDMConversations(currentUser.id).then(convos => { if (mounted) setDmConversations(convos); }).catch(console.error);
    };
    loadConversations();
    const channel = subscribeToDMs(currentUser.id, loadConversations);
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    if (activeDM) return; // DM thread loading handled separately below
    let mounted = true;

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
  }, [activeChannel, activeDM]);

  useEffect(() => {
    if (!activeDM || !currentUser) return;
    let mounted = true;

    const loadThread = async () => {
      try {
        const data = await getDMThread(currentUser.id, activeDM.id);
        if (!mounted) return;
        const formatted = data.map((m: any) => ({
          id: m.id,
          user: m.sender_id === currentUser.id ? (currentProfile?.username || 'You') : activeDM.username,
          text: m.content,
          timestamp: new Date(m.created_at),
          sender_id: m.sender_id,
        }));
        setMessages(formatted);
      } catch (e) {
        console.error(e);
      }
    };
    loadThread();

    const channel = subscribeToDMs(currentUser.id, (payload: any) => {
      const row = payload?.new;
      if (row && (row.sender_id === activeDM.id || row.receiver_id === activeDM.id)) loadThread();
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeDM, currentUser, currentProfile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !currentUser) return;
    setInput('');
    try {
      const saved = activeDM
        ? await sendMessage(currentUser.id, text, undefined, activeDM.id)
        : await sendMessage(currentUser.id, text, activeChannel);
      // Optimistically render our own message immediately. The realtime
      // subscription only fires when Supabase replication is enabled, and even
      // then not for the sender's own client reliably — without this the sender
      // types, hits send, and sees nothing until a manual reload.
      setMessages(prev => prev.some(m => m.id === saved.id) ? prev : [
        ...prev,
        { id: saved.id, user: currentProfile?.username || 'You', text: saved.content, timestamp: new Date(saved.created_at), sender_id: saved.sender_id },
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  // Lounge's contextual strip: which channel you're in, who's actually
  // online (real presence, not a count), and a one-tap jump to switch
  // channels — the same state the sidebar already drives.
  const channels = ['general', 'script-notes', 'production', 'dailies', 'legal'];
  const loungePill = useMemo(() => {
    const onlineCrew = crewList.filter(m => onlineIds.has(m.id)).length;
    const nextChannel = channels[(channels.indexOf(activeChannel) + 1) % channels.length];
    return {
      module: 'lounge',
      title: `#${activeChannel}`,
      fields: [
        { label: 'Online', value: `${onlineCrew}/${crewList.length}`, color: onlineCrew > 0 ? '#00cc66' : undefined },
        { label: 'Msgs', value: `${messages.length}` },
      ],
      actions: [
        { id: 'next-channel', label: `→ #${nextChannel}`, onClick: () => setActiveChannel(nextChannel) },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel, crewList, onlineIds, messages.length]);

  usePillStage(loungePill, [loungePill]);

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
        background: 'rgba(6,6,6,0.95)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        boxShadow: '0 1px 0 rgba(16,185,129,0.08) inset',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6, color: 'var(--fg)', opacity: 0.7, transition: 'opacity 0.2s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
            >MC</div>
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, color: '#10b981', textTransform: 'uppercase' }}>Lounge</div>
        </div>

        <div className="mobile-nav-hide" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
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

          {/* Music player */}
          <SpotifyPlayer />
          <NotificationBell />
        </div>
        <MobileNavMenu />
      </nav>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Channel Sidebar (Slack-style) */}
        <div style={{
          width: 220,
          background: '#050a14',
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
                     onClick={() => { setActiveChannel(ch.id); setActiveDM(null); }}
                     style={{
                       display: 'flex', alignItems: 'center', gap: 8,
                       padding: '6px 10px', borderRadius: 4,
                       background: (isActive && !activeDM) ? 'rgba(215,52,11,0.1)' : 'transparent',
                       border: 'none', color: (isActive && !activeDM) ? '#fff' : '#888',
                       cursor: 'pointer', transition: 'all 0.2s',
                       fontFamily: 'var(--mono)', fontSize: 11
                     }}
                   >
                     <Icon size={12} color={(isActive && !activeDM) ? 'var(--accent)' : '#666'} />
                     {ch.name}
                   </button>
                 );
               })}
             </div>
          </div>

          <div style={{ padding: '0 16px 20px' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Direct Messages</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {dmConversations.length === 0 && (
                <div style={{ color: '#444', fontFamily: 'var(--mono)', fontSize: 9 }}>NO DMS YET</div>
              )}
              {dmConversations.map(convo => {
                const isActive = activeDM?.id === convo.id;
                return (
                  <button
                    key={convo.id}
                    onClick={() => setActiveDM({ id: convo.id, username: convo.username })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 4,
                      background: isActive ? 'rgba(215,52,11,0.1)' : 'transparent',
                      border: 'none', color: isActive ? '#fff' : '#888',
                      cursor: 'pointer', transition: 'all 0.2s',
                      fontFamily: 'var(--mono)', fontSize: 11,
                      textAlign: 'left', overflow: 'hidden',
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: isActive ? 'var(--accent)' : '#555' }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{convo.username}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 'auto', padding: 20, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                  {(currentProfile?.username || 'U')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                   <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{currentProfile?.username || 'Guest'}</div>
                   <div style={{ fontSize: 9, color: currentUser ? '#00cc66' : '#666' }}>{currentUser ? '● Online' : 'Not signed in'}</div>
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
               <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{activeDM ? activeDM.username : `#${activeChannel}`}</span>
               {!activeDM && (
                 <>
                   <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                   <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{crewList.length} member{crewList.length !== 1 ? 's' : ''}</span>
                 </>
               )}
             </div>
             <Users size={14} color="#666" />
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#444', marginTop: 100, fontFamily: 'var(--mono)', fontSize: 10 }}>
                  {activeDM ? `NO MESSAGES WITH ${activeDM.username.toUpperCase()} YET` : `NO MESSAGES IN #${activeChannel.toUpperCase()} YET`}
                </div>
              ) : messages.map(msg => <MessageBubble key={msg.id} msg={msg} currentUserId={currentUser?.id} />)}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input — extra bottom padding clears the floating EcosystemTaskbar
              (fixed, bottom:28, ~64px tall, centered) which otherwise sits on
              top of the composer and blocks clicking into the message field. */}
          <div style={{
            padding: '16px 28px 108px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            background: '#090909',
            flexShrink: 0,
          }}>
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={activeDM ? `Message ${activeDM.username}...` : `Message #${activeChannel}...`}
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
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(215,52,11,0.35)')}
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

          {crewList.length === 0 && (
            <div style={{ color: '#444', fontFamily: 'var(--mono)', fontSize: 9, marginTop: 8 }}>NO CREW YET</div>
          )}
          {crewList.map((member, i) => (
            <CrewMemberRow key={member.id ?? i} member={member} online={onlineIds.has(member.id)} delay={i * 0.08} onMessage={openDM} />
          ))}
        </div>
      </div>

      <style>{`
        textarea::placeholder { color: rgba(240,236,228,0.18); }
      `}</style>
    </main>
  );
}
