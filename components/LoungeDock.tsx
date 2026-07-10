'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Send, ExternalLink, Hash, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useProject } from '@/lib/context/ProjectContext';
import { listChannels, type Channel } from '@/lib/supabase/channels';
import { getChannelMessagesByUuid, sendChannelMessage, subscribeToChannelUuid, type DBMessage } from '@/lib/supabase/messages';

const LAST_SEEN_KEY = 'mc_lounge_last_seen';

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

  // Drag and settings states
  const dragControls = useDragControls();
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [scale, setScale] = useState(1);
  const [preset, setPreset] = useState<'br' | 'bl' | 'tr' | 'tl'>('br');
  const [draggable, setDraggable] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
    
    // Load window state settings
    if (typeof window !== 'undefined') {
      const sz = localStorage.getItem('mc_lounge_size') as any;
      if (sz) setSize(sz);
      const sc = Number(localStorage.getItem('mc_lounge_scale') || '1');
      setScale(sc);
      const pr = localStorage.getItem('mc_lounge_preset') as any;
      if (pr) setPreset(pr);
      const dr = localStorage.getItem('mc_lounge_draggable') !== '0';
      setDraggable(dr);
    }
  }, []);

  const changeSize = (s: 'sm' | 'md' | 'lg') => { setSize(s); localStorage.setItem('mc_lounge_size', s); };
  const changeScale = (s: number) => { setScale(s); localStorage.setItem('mc_lounge_scale', String(s)); };
  const changePreset = (p: 'br' | 'bl' | 'tr' | 'tl') => { setPreset(p); localStorage.setItem('mc_lounge_preset', p); };
  const toggleDraggable = () => { setDraggable(d => { const next = !d; localStorage.setItem('mc_lounge_draggable', next ? '1' : '0'); return next; }); };

  const getPresetStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      transformOrigin: preset.includes('t') ? 'top' : 'bottom',
    };
    if (preset === 'br') { base.bottom = 104; base.right = 24; }
    else if (preset === 'bl') { base.bottom = 104; base.left = 24; }
    else if (preset === 'tr') { base.top = 24; base.right = 24; }
    else if (preset === 'tl') { base.top = 24; base.left = 24; }
    return base;
  };

  const getDimensions = () => {
    if (size === 'sm') return { width: 320, height: 380 };
    if (size === 'lg') return { width: 480, height: 580 };
    return { width: 380, height: 460 }; // md
  };

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
  }, [activeChannel?.id]);

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
    try { await sendChannelMessage(userId, text, activeChannel.id); } catch { /* silent fail on dock */ }
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
            drag={draggable}
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              ...getPresetStyles(),
              width: getDimensions().width,
              height: getDimensions().height,
              transform: `scale(${scale})`,
              background: 'rgba(12,12,12,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              boxShadow: '0 28px 70px rgba(0,0,0,0.7)',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            {/* Settings Overlay panel */}
            {showSettings && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.97)',
                zIndex: 30, display: 'flex', flexDirection: 'column', padding: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 10, marginBottom: 16 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: 2, color: 'var(--accent)' }}>LOUNGE CONFIG</span>
                  <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: 1 }}>
                    [BACK]
                  </button>
                </div>

                <div style={{ display: 'grid', gap: 16, flex: 1, overflowY: 'auto' }}>
                  {/* Size Preset */}
                  <div>
                    <label style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, letterSpacing: 1 }}>WINDOW SIZE</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['sm', 'md', 'lg'] as const).map(s => (
                        <button key={s} onClick={() => changeSize(s)}
                          style={{
                            flex: 1, padding: '6px 0', fontSize: 9.5, fontFamily: 'var(--mono)',
                            background: size === s ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${size === s ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                            color: size === s ? '#34d399' : 'rgba(255,255,255,0.6)', cursor: 'pointer',
                            borderRadius: 6
                          }}>
                          {s.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Window Scale */}
                  <div>
                    <label style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, letterSpacing: 1 }}>WINDOW SCALE ({scale.toFixed(2)}x)</label>
                    <input type="range" min="0.75" max="1.3" step="0.05" value={scale} onChange={e => changeScale(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)' }} />
                  </div>

                  {/* Corner Presets */}
                  <div>
                    <label style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, letterSpacing: 1 }}>SCREEN CORNER PIN</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[
                        { p: 'tl', label: 'Top Left' },
                        { p: 'tr', label: 'Top Right' },
                        { p: 'bl', label: 'Bottom Left' },
                        { p: 'br', label: 'Bottom Right' },
                      ].map(({ p, label }) => (
                        <button key={p} onClick={() => changePreset(p as any)}
                          style={{
                            padding: '6px 0', fontSize: 9, fontFamily: 'var(--mono)',
                            background: preset === p ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${preset === p ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                            color: preset === p ? '#34d399' : 'rgba(255,255,255,0.6)', cursor: 'pointer',
                            borderRadius: 6
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Movable Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>ALLOW DRAGGING</span>
                    <button onClick={toggleDraggable}
                      style={{
                        padding: '4px 10px', fontSize: 8.5, fontFamily: 'var(--mono)',
                        background: draggable ? 'rgba(16,185,129,0.15)' : 'rgba(215, 52, 11, 0.15)',
                        border: `1px solid ${draggable ? '#10b981' : 'var(--accent)'}`,
                        color: draggable ? '#34d399' : 'var(--accent)', cursor: 'pointer',
                        borderRadius: 6
                      }}>
                      {draggable ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              </div>
            )}

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
              <div
                onPointerDown={draggable ? (e) => dragControls.start(e) : undefined}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  cursor: draggable ? 'grab' : 'default', userSelect: 'none'
                }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeChannel ? `#${activeChannel.name}` : 'Lounge'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => setShowSettings(!showSettings)} title="Lounge Settings" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex' }}>
                    <Settings size={13} />
                  </button>
                  <Link href="/lounge" title="Open full Lounge" style={{ color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                    <ExternalLink size={13} />
                  </Link>
                </div>
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
