'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Users, Smile, Hash, Lock, Settings as SettingsIcon, MessageSquare, X } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import { supabase } from '@/lib/supabase/client';
import { getChannelMessages, getDMThread, sendMessage, subscribeToChannel, toggleReaction, getThreadReplies, getReplyCounts } from '@/lib/supabase/messages';
import { useProject } from '@/lib/context/ProjectContext';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { notify } from '@/lib/supabase/notifications';
import { useToast } from '@/components/Toast';
import Avatar from '@/components/Avatar';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
  sender_id?: string;
  mine?: boolean;
  reactions?: Record<string, string[]>;
  avatar_url?: string | null;
}

const REACTION_CHOICES = ['👍', '❤️', '🔥', '🎬', '😂', '🎉', '👀', '🙏'];

// Live production feed for the active project — surfaces the latest changes
// across scenes, budget, milestones, crew, concept board, and characters.
function ProductionFeed({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<{ label: string; t: string; color: string }[]>([]);

  useEffect(() => {
    let on = true;
    (async () => {
      const [sc, bd, tl, cr, ca] = await Promise.all([
        supabase.from('scenes').select('title,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
        supabase.from('budget_items').select('category,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
        supabase.from('timeline_items').select('title,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
        supabase.from('project_crew').select('role,created_at,profiles!project_crew_user_id_fkey(username)').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
        supabase.from('concept_assets').select('title,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
      ]);
      if (!on) return;
      const merged = [
        ...(sc.data || []).map((x: any) => ({ label: `Scene — ${x.title}`, t: x.created_at, color: '#f59e0b' })),
        ...(bd.data || []).map((x: any) => ({ label: `Budget — ${x.category}`, t: x.created_at, color: '#10b981' })),
        ...(tl.data || []).map((x: any) => ({ label: `Milestone — ${x.title}`, t: x.created_at, color: '#6366f1' })),
        ...(cr.data || []).map((x: any) => ({ label: `Crew — ${x.profiles?.username || 'member'}`, t: x.created_at, color: '#ec4899' })),
        ...(ca.data || []).map((x: any) => ({ label: `Concept — ${x.title || 'image'}`, t: x.created_at, color: '#a855f7' })),
      ].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime()).slice(0, 8);
      setItems(merged);
    })();
    return () => { on = false; };
  }, [projectId]);

  const ago = (iso: string) => { const d = (Date.now() - new Date(iso).getTime()) / 3600000; return d < 1 ? `${Math.max(1, Math.floor(d * 60))}m` : d < 24 ? `${Math.floor(d)}h` : `${Math.floor(d / 24)}d`; };

  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 10 }}>Production Feed</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: it.color, marginTop: 5, flexShrink: 0, boxShadow: `0 0 6px ${it.color}` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--fg-muted)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-subtle)', flexShrink: 0 }}>{ago(it.t)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ msg, currentUserId, onReact, onOpenThread, replyCount = 0 }: { msg: Message, currentUserId?: string, onReact: (id: string, emoji: string) => void, onOpenThread?: (m: Message) => void, replyCount?: number }) {
  const isMe = msg.mine || (msg.sender_id && msg.sender_id === currentUserId);
  const [hovered, setHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const reactions = Object.entries(msg.reactions || {}).filter(([, u]) => u.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPickerOpen(false); }}
      style={{
        marginBottom: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start',
      }}
    >
      {!isMe && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <Avatar src={msg.avatar_url} name={msg.user} size={20} />
          <span style={{ fontFamily: 'var(--display)', fontSize: 13, letterSpacing: 2, color: 'var(--accent)' }}>
            {msg.user}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-subtle)' }}>
            {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row', maxWidth: '80%' }}>
        <div style={{
          padding: '12px 16px',
          background: isMe ? 'rgba(255,60,0,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isMe ? 'rgba(255,60,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
        }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.65, color: 'rgba(240,236,228,0.85)', margin: 0 }}>
            {msg.text}
          </p>
        </div>

        {/* React affordance */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setPickerOpen(o => !o)}
            aria-label="Add reaction"
            style={{ opacity: hovered || pickerOpen ? 1 : 0, transition: 'opacity 0.15s', width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,20,0.9)', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smile size={13} />
          </button>
          {pickerOpen && (
            <div style={{ position: 'absolute', bottom: '100%', [isMe ? 'right' : 'left']: 0, marginBottom: 6, display: 'flex', gap: 2, padding: 5, background: 'rgba(14,14,14,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 20 } as React.CSSProperties}>
              {REACTION_CHOICES.map(e => (
                <button key={e} onClick={() => { onReact(msg.id, e); setPickerOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px', borderRadius: 6 }}>{e}</button>
              ))}
            </div>
          )}
        </div>

        {/* Reply-in-thread affordance */}
        {onOpenThread && (
          <button onClick={() => onOpenThread(msg)} aria-label="Reply in thread"
            style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s', width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(20,20,20,0.9)', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={12} />
          </button>
        )}
      </div>

      {/* Thread summary */}
      {replyCount > 0 && onOpenThread && (
        <button onClick={() => onOpenThread(msg)} style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 99, padding: '3px 10px', cursor: 'pointer', color: '#10b981', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 0.5, alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
          <MessageSquare size={10} /> {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {/* Reaction pills */}
      {reactions.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
          {reactions.map(([emoji, users]) => {
            const reacted = !!currentUserId && users.includes(currentUserId);
            return (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)', background: reacted ? 'rgba(255,60,0,0.16)' : 'rgba(255,255,255,0.05)', border: `1px solid ${reacted ? 'rgba(255,60,0,0.4)' : 'rgba(255,255,255,0.08)'}`, color: reacted ? '#ff7a4d' : 'var(--fg-muted)' }}>
                <span>{emoji}</span><span>{users.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {isMe && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-subtle)', marginTop: 4 }}>
          {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </motion.div>
  );
}

export default function LoungePage() {
  useRequireAuth();
  const { toast } = useToast();
  const { activeProject, projects, setActiveProject } = useProject();
  const [activeChannel, setActiveChannel] = useState('general');
  const [dmTarget, setDmTarget] = useState<{ id: string; name: string } | null>(null);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);
  const [threadInput, setThreadInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [crewList, setCrewList] = useState<any[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastBroadcast = useRef(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && mounted) {
        setCurrentUser(user);
        const { data: mine } = await supabase.from('profiles').select('username, avatar_url, role, status').eq('id', user.id).single();
        if (mounted) setMyProfile(mine);
      }

      const { data } = await supabase.from('profiles').select('*').limit(20);
      if (data && mounted) {
        setCrewList(data.map(p => ({
          id: p.id,
          name: p.username || 'User',
          role: p.role || 'Crew',
          avatar: p.avatar_url,
          online: p.status === 'OPEN'
        })));
      }
    })();

    const loadMessages = async () => {
      try {
        const data = dmTarget && currentUser
          ? await getDMThread(currentUser.id, dmTarget.id)
          : await getChannelMessages(activeChannel);
        if (!mounted) return;
        const formatted = data.map((m: any) => ({
          id: m.id,
          user: m.profiles?.username || 'Unknown',
          text: m.content,
          timestamp: new Date(m.created_at),
          sender_id: m.sender_id,
          reactions: m.reactions || {},
          avatar_url: m.profiles?.avatar_url,
        }));
        setMessages(formatted);
        if (!dmTarget) {
          const counts = await getReplyCounts(formatted.map(f => f.id));
          if (mounted) setReplyCounts(counts);
        }
      } catch (e) {
        console.error(e);
      }
    };
    // In DM mode we need the signed-in user resolved first.
    if (dmTarget && !currentUser) return () => { mounted = false; };
    loadMessages();

    let channel: any;
    if (dmTarget && currentUser) {
      const pairKey = [currentUser.id, dmTarget.id].sort().join(':');
      channel = supabase.channel(`dm:${pairKey}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
          const m = payload.new;
          if ((m.sender_id === currentUser.id && m.receiver_id === dmTarget.id) ||
              (m.sender_id === dmTarget.id && m.receiver_id === currentUser.id)) loadMessages();
        })
        .subscribe();
    } else {
      channel = subscribeToChannel(activeChannel, () => loadMessages());
    }

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeChannel, dmTarget, currentUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing indicators over Realtime broadcast (Slack/Discord style). Each
  // channel gets an ephemeral broadcast room; peers show for ~3s per keypress.
  useEffect(() => {
    const uname = myProfile?.username || 'Someone';
    const ch = supabase.channel(`typing:${activeChannel}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'typing' }, ({ payload }: any) => {
      const name = payload?.username;
      if (!name) return;
      setTypingUsers(prev => prev.includes(name) ? prev : [...prev, name]);
      clearTimeout(typingTimers.current[name]);
      typingTimers.current[name] = setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== name)), 3200);
    }).subscribe();
    typingChannelRef.current = { ch, uname };
    return () => { supabase.removeChannel(ch); setTypingUsers([]); };
  }, [activeChannel, myProfile?.username]);

  // Real live presence — who is actually in the Lounge right now (Discord/
  // Slack style), tracked over a shared Realtime presence channel.
  useEffect(() => {
    if (!currentUser) return;
    const ch = supabase.channel('lounge-presence', { config: { presence: { key: currentUser.id } } });
    ch.on('presence', { event: 'sync' }, () => {
      setOnlineIds(new Set(Object.keys(ch.presenceState())));
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await ch.track({ online_at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
  }, [currentUser]);

  const broadcastTyping = () => {
    const now = Date.now();
    if (now - lastBroadcast.current < 1200) return; // throttle
    lastBroadcast.current = now;
    typingChannelRef.current?.ch?.send({ type: 'broadcast', event: 'typing', payload: { username: typingChannelRef.current.uname } });
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    // Optimistic toggle.
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const r: Record<string, string[]> = { ...(m.reactions || {}) };
      const users = r[emoji] || [];
      if (users.includes(currentUser.id)) { const n = users.filter(u => u !== currentUser.id); if (n.length) r[emoji] = n; else delete r[emoji]; }
      else r[emoji] = [...users, currentUser.id];
      return { ...m, reactions: r };
    }));
    try { await toggleReaction(messageId, emoji, currentUser.id); } catch (e) { console.error(e); }
  };

  // Thread panel — load a message's replies live and let the user reply in it.
  useEffect(() => {
    if (!threadParent) { setThreadReplies([]); return; }
    let mounted = true;
    const load = async () => {
      const data = await getThreadReplies(threadParent.id);
      if (!mounted) return;
      setThreadReplies(data.map((m: any) => ({ id: m.id, user: m.profiles?.username || 'Unknown', text: m.content, timestamp: new Date(m.created_at), sender_id: m.sender_id, reactions: m.reactions || {} })));
    };
    load();
    const ch = supabase.channel(`thread:${threadParent.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `parent_message_id=eq.${threadParent.id}` }, () => load())
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [threadParent]);

  const handleThreadSend = async () => {
    const text = threadInput.trim();
    if (!text || !currentUser || !threadParent) return;
    setThreadInput('');
    try {
      await sendMessage(currentUser.id, text, activeChannel, undefined, threadParent.id);
      setReplyCounts(prev => ({ ...prev, [threadParent.id]: (prev[threadParent.id] || 0) + 1 }));
      // Notify the original author of the reply.
      if (threadParent.sender_id && threadParent.sender_id !== currentUser.id) {
        notify(threadParent.sender_id, {
          type: 'reply',
          title: `${myProfile?.username || 'Someone'} replied in a thread`,
          body: text.length > 90 ? text.slice(0, 90) + '…' : text,
          link: '/lounge',
        }, currentUser.id);
      }
    } catch (e: any) { console.error(e); setThreadInput(text); toast(e?.message || 'Reply failed to send', 'error'); }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !currentUser) return;
    setInput('');
    try {
      const from = myProfile?.username || 'Someone';
      if (dmTarget) {
        await sendMessage(currentUser.id, text, undefined, dmTarget.id);
        notify(dmTarget.id, {
          type: 'reply',
          title: `Direct message from ${from}`,
          body: text.length > 90 ? text.slice(0, 90) + '…' : text,
          link: '/lounge',
        }, currentUser.id);
        return;
      }
      await sendMessage(currentUser.id, text, activeChannel);
      // Notify anyone @mentioned by username (matched against known crew).
      const mentioned = new Set((text.match(/@([a-zA-Z0-9_]+)/g) || []).map(m => m.slice(1).toLowerCase()));
      if (mentioned.size > 0) {
        crewList
          .filter(m => m.id !== currentUser.id && mentioned.has(String(m.name).toLowerCase()))
          .forEach(m => notify(m.id, {
            type: 'mention',
            title: `${from} mentioned you in #${activeChannel}`,
            body: text.length > 90 ? text.slice(0, 90) + '…' : text,
            link: '/lounge',
          }, currentUser.id));
      }
    } catch (e: any) {
      console.error(e);
      setInput(text); // restore the unsent message
      toast(e?.message || 'Message failed to send', 'error');
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

          {/* Live crew count */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 14px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 'var(--radius-full)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00cc66', boxShadow: '0 0 8px rgba(0,204,102,0.8)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1, color: 'var(--fg-muted)' }}>
              {onlineIds.size} online · {crewList.length} crew
            </span>
          </div>
        </div>
      </nav>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Channel Sidebar (Slack-style) */}
        <div className="mc-lounge-channels" style={{
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
                 const isActive = activeChannel === ch.id && !dmTarget;
                 return (
                   <button
                     key={ch.id}
                     onClick={() => { setActiveChannel(ch.id); setDmTarget(null); }}
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
                <Avatar src={myProfile?.avatar_url} name={myProfile?.username || currentUser?.email} size={28} radius={6} />
                <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{myProfile?.username || 'You'}</div>
                   <div style={{ fontSize: 9, color: myProfile?.status === 'BUSY' ? '#f59e0b' : '#00cc66' }}>● {myProfile?.status === 'BUSY' ? 'Busy' : 'Available'}</div>
                </div>
                <Link href="/settings" title="Settings"><SettingsIcon size={14} color="#666" style={{ cursor: 'pointer' }} /></Link>
             </div>
          </div>
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Channel Header */}
          <div style={{ padding: '12px 32px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               {dmTarget ? (
                 <>
                   <span style={{ fontSize: 8, color: '#10b981', fontFamily: 'var(--mono)', letterSpacing: 1, background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: 99 }}>DIRECT</span>
                   <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>@{dmTarget.name}</span>
                   {onlineIds.has(dmTarget.id) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00cc66', boxShadow: '0 0 8px rgba(0,204,102,0.8)' }} />}
                 </>
               ) : (
                 <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>#{activeChannel}</span>
               )}
               <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
               <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{messages.length} message{messages.length === 1 ? '' : 's'}</span>
             </div>
             <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-muted)' }}>
                {dmTarget ? (
                  <button onClick={() => setDmTarget(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--fg-muted)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1 }}>← CHANNELS</button>
                ) : (
                  <><Users size={13} color="#666" /> {crewList.length}</>
                )}
             </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#444', marginTop: 100, fontFamily: 'var(--mono)', fontSize: 10 }}>
                  {dmTarget ? `START A CONVERSATION WITH @${dmTarget.name.toUpperCase()}` : `NO MESSAGES IN #${activeChannel.toUpperCase()} YET`}
                </div>
              ) : messages.map(msg => <MessageBubble key={msg.id} msg={msg} currentUserId={currentUser?.id} onReact={handleReact} onOpenThread={dmTarget ? undefined : setThreadParent} replyCount={replyCounts[msg.id] || 0} />)}
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
            {/* Typing indicator */}
            <div style={{ maxWidth: 720, margin: '0 auto', height: 14, marginBottom: 4 }}>
              {typingUsers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, color: '#10b981', letterSpacing: 0.5 }}>
                  <span style={{ display: 'inline-flex', gap: 2 }}>
                    {[0, 1, 2].map(i => (
                      <motion.span key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} style={{ width: 3, height: 3, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    ))}
                  </span>
                  {typingUsers.slice(0, 2).join(', ')}{typingUsers.length > 2 ? ` +${typingUsers.length - 2}` : ''} {typingUsers.length === 1 ? 'is' : 'are'} typing…
                </div>
              )}
            </div>
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ position: 'relative', alignSelf: 'center' }}>
                <button style={{ background: 'none', border: 'none', color: showEmoji ? 'var(--fg)' : 'var(--fg-muted)', padding: 10, cursor: 'pointer', transition: 'color 0.2s' }}
                  onClick={() => setShowEmoji(v => !v)} aria-label="emoji">
                  <Smile size={16} />
                </button>
                {showEmoji && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, background: 'rgba(14,14,14,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, display: 'flex', gap: 4, flexWrap: 'wrap', width: 180, boxShadow: '0 12px 30px rgba(0,0,0,0.6)' }}>
                    {['😀','😂','🔥','❤️','👍','🎬','🎥','✨','💡','🎉','😮','🙏'].map(e => (
                      <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmoji(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 2 }}>{e}</button>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                value={input}
                onChange={e => { setInput(e.target.value); if (e.target.value.trim()) broadcastTyping(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={dmTarget ? `Message @${dmTarget.name}...` : `Message #${activeChannel}...`}
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
        <div className="mc-lounge-crew" style={{
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
          {activeProject && <ProductionFeed projectId={activeProject.id} />}

          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 12 }}>
            Crew
          </div>

          {[...crewList].sort((a, b) => Number(onlineIds.has(b.id)) - Number(onlineIds.has(a.id))).map((member, i) => {
            const isOnline = onlineIds.has(member.id);
            const isSelf = member.id === currentUser?.id;
            return (
            <motion.div
              key={member.id || i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.05 }}
              onClick={() => { if (!isSelf) setDmTarget({ id: member.id, name: member.name }); }}
              title={isSelf ? 'This is you' : `Message ${member.name}`}
              style={{
                padding: '10px 12px',
                border: `1px solid ${dmTarget?.id === member.id ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: isSelf ? 'default' : 'pointer',
                background: dmTarget?.id === member.id ? 'rgba(16,185,129,0.06)' : isOnline ? 'rgba(0,204,102,0.03)' : 'transparent',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar src={member.avatar} name={member.name} size={26} />
                <div style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 8, height: 8, borderRadius: '50%',
                  border: '1.5px solid #090909',
                  background: isOnline ? '#00cc66' : '#444',
                  boxShadow: isOnline ? '0 0 6px rgba(0,204,102,0.8)' : 'none',
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.3, color: isOnline ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: 600 }}>
                    {member.name}
                  </div>
                  {isOnline && (
                    <div style={{ fontSize: 7, color: '#00cc66', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Live</div>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1, color: 'var(--fg-subtle)', marginTop: 2 }}>
                  <span>{member.role}</span>
                </div>
              </div>
            </motion.div>
          ); })}
        </div>
      </div>

      {/* Thread drawer */}
      <AnimatePresence>
        {threadParent && (
          <motion.div
            initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(94vw, 380px)', background: 'rgba(9,9,9,0.98)', borderLeft: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)', zIndex: 200, display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.6)' }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#10b981' }}>Thread</span>
              <button onClick={() => setThreadParent(null)} style={{ background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
              {/* Parent message */}
              <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 12, letterSpacing: 1, color: 'var(--accent)', marginBottom: 4 }}>{threadParent.user}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.6, color: 'rgba(240,236,228,0.85)' }}>{threadParent.text}</div>
              </div>
              {threadReplies.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#444', marginTop: 40, fontFamily: 'var(--mono)', fontSize: 9.5 }}>No replies yet — start the thread.</div>
              ) : threadReplies.map(r => (
                <div key={r.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: r.sender_id === currentUser?.id ? '#ff7a4d' : '#10b981', fontWeight: 600 }}>{r.sender_id === currentUser?.id ? 'You' : r.user}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-subtle)' }}>{r.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 13.5, lineHeight: 1.6, color: 'rgba(240,236,228,0.82)' }}>{r.text}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
              <input value={threadInput} onChange={e => setThreadInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleThreadSend(); } }}
                placeholder="Reply…" style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--fg)', fontFamily: 'var(--serif)', fontSize: 13, outline: 'none' }} />
              <button onClick={handleThreadSend} style={{ padding: '10px 14px', background: threadInput.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.05)', border: 'none', color: threadInput.trim() ? 'var(--bg)' : 'var(--fg-muted)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Send size={13} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        textarea::placeholder { color: rgba(240,236,228,0.18); }
      `}</style>
    </main>
  );
}
