'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Send, ExternalLink, Hash } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useProject } from '@/lib/context/ProjectContext';
import { listChannels, type Channel } from '@/lib/supabase/channels';
import { getChannelMessagesByUuid, sendChannelMessage, subscribeToChannelUuid, type DBMessage } from '@/lib/supabase/messages';

const LAST_SEEN_KEY = 'mc_lounge_last_seen';

// The Lounge, docked beside whatever the user is actually working on instead
// of demanding a full page navigation. Community + the active project's
// channels stay one glance away; opening the panel reads like a slide-over,
// not a context switch. Full thread/member management still lives on the
// dedicated /lounge page — this dock covers the "read and reply without
// leaving" case the redesign asks for, with a link out for everything else.
export default function LoungeDock() {
  const pathname = usePathname();
  const { activeProject } = useProject();
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
  }, []);

  const loadChannels = useCallback(async () => {
    if (!userId) return;
    const list = await listChannels(activeProject?.id ?? null);
    setChannels(list);
    setActiveChannel(prev => {
      if (prev && list.some(c => c.id === prev.id)) return prev;
      return list.find(c => c.project_id === (activeProject?.id ?? null)) || list[0] || null;
    });
  }, [userId, activeProject?.id]);

  useEffect(() => { loadChannels(); }, [loadChannels]);

  // Lightweight unread signal: any channel message newer than the last time
  // the dock was opened. No new schema — just a localStorage watermark, in
  // keeping with "notification rail" rather than a full read-state model.
  useEffect(() => {
    if (!userId || channels.length === 0) return;
    let cancelled = false;
    (async () => {
      const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) || 0);
      const { data } = await supabase
        .from('messages')
        .select('created_at')
        .in('channel_uuid', channels.map(c => c.id))
        .order('created_at', { ascending: false })
        .limit(1);
      if (!cancelled && data && data[0] && new Date(data[0].created_at).getTime() > lastSeen) setHasUnread(true);
    })();
    return () => { cancelled = true; };
  }, [userId, channels]);

  useEffect(() => {
    if (!activeChannel) { setMessages([]); return; }
    let cancelled = false;
    getChannelMessagesByUuid(activeChannel.id, 50).then(data => { if (!cancelled) setMessages(data as any); });
    const sub = subscribeToChannelUuid(activeChannel.id, (payload) => {
      setMessages(prev => [...prev, payload.new as DBMessage]);
    });
    return () => { cancelled = true; supabase.removeChannel(sub); };
  }, [activeChannel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages.length]);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    setHasUnread(false);
    const h = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const send = async () => {
    if (!draft.trim() || !userId || !activeChannel) return;
    const text = draft.trim();
    setDraft('');
    try { await sendChannelMessage(userId, text, activeChannel.id); } catch { /* dock stays optimistic-free; full Lounge surfaces errors */ }
  };

  if (!userId || pathname === '/auth' || pathname === '/login' || pathname === '/lounge') return null;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <motion.button
        onClick={() => setOpen(o => !o)}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={{ scale: 1.18, y: -6 }}
        whileTap={{ scale: 0.93 }}
        transition={{ type: 'spring', stiffness: 500, damping: 26 }}
        title="Lounge"
        style={{
          width: 46, height: 46, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'rgba(16,185,129,0.10)' : hovered ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', cursor: 'pointer',
          color: open ? '#10b981' : hovered ? 'rgba(224, 221, 174,0.7)' : 'rgba(224, 221, 174,0.3)', transition: 'background 0.25s, color 0.25s', position: 'relative',
        }}
      >
        <MessageSquare size={19} strokeWidth={1.5} />
        {hasUnread && !open && (
          <span style={{ position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.7)' }} />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 12, width: 380, maxWidth: '92vw', height: 460, maxHeight: '70vh', background: 'rgba(12,12,12,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, boxShadow: '0 28px 70px rgba(0,0,0,0.7)', overflow: 'hidden', zIndex: 20, display: 'flex' }}
          >
            {/* Channel rail */}
            <div style={{ width: 96, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '10px 6px' }}>
              {activeProject && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 1, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '2px 4px', marginBottom: 4 }}>{activeProject.title}</div>
              )}
              {channels.map(c => (
                <button key={c.id} onClick={() => setActiveChannel(c)} title={c.name} style={{
                  display: 'flex', alignItems: 'center', gap: 4, width: '100%', padding: '6px 6px', marginBottom: 2, borderRadius: 6,
                  background: activeChannel?.id === c.id ? 'rgba(16,185,129,0.12)' : 'transparent', border: 'none', cursor: 'pointer',
                  color: activeChannel?.id === c.id ? '#34d399' : 'rgba(255,255,255,0.5)', textAlign: 'left',
                }}>
                  <Hash size={10} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                </button>
              ))}
              {channels.length === 0 && (
                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.3)', padding: 6, lineHeight: 1.4 }}>No channels yet.</div>
              )}
            </div>

            {/* Active channel */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeChannel ? `#${activeChannel.name}` : 'Lounge'}
                </span>
                <Link href="/lounge" title="Open full Lounge" style={{ color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                  <ExternalLink size={13} />
                </Link>
              </div>

              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!activeChannel ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11.5, fontFamily: 'var(--mono)' }}>
                    <MessageSquare size={20} style={{ opacity: 0.3, marginBottom: 8 }} /><br />Pick a channel to read along.
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11.5 }}>No messages yet — say hello.</div>
                ) : messages.map(m => (
                  <div key={m.id} style={{ fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--mono)', fontSize: 9.5, marginRight: 6 }}>{(m as any).profiles?.username || 'someone'}</span>
                    <span style={{ color: 'var(--fg)' }}>{m.content}</span>
                  </div>
                ))}
              </div>

              {activeChannel && (
                <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') send(); }}
                    placeholder={`Message #${activeChannel.name}`}
                    style={{ flex: 1, minWidth: 0, padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 11.5 }}
                  />
                  <button onClick={send} disabled={!draft.trim()} aria-label="Send" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', cursor: draft.trim() ? 'pointer' : 'default', opacity: draft.trim() ? 1 : 0.4 }}>
                    <Send size={13} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
