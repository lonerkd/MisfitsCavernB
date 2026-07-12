'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Notification, fetchNotifications, markRead, markAllRead, deleteNotification, typeEnabled } from '@/lib/supabase/notifications';
import { awaitOSUser } from '@/lib/os';

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const unread = items.filter(n => !n.read).length;

  const load = useCallback(async (uid: string) => {
    setItems(await fetchNotifications(uid));
  }, []);

  useEffect(() => {
    awaitOSUser().then((user) => {
      if (!user) return;
      setUserId(user.id);
      load(user.id);
    });
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notif-${userId}-${Math.random().toString(36).substring(2, 9)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new as Notification;
        if (!typeEnabled(n.type)) return;
        setItems(prev => [n, ...prev.filter(x => x.id !== n.id)].slice(0, 30));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const openItem = async (n: Notification) => {
    if (!n.read) { setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x)); await markRead(n.id); }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const clearOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItems(prev => prev.filter(x => x.id !== id));
    await deleteNotification(id);
  };

  const allRead = async () => {
    if (!userId) return;
    setItems(prev => prev.map(x => ({ ...x, read: true })));
    await markAllRead(userId);
  };

  if (!userId || pathname === '/auth' || pathname === '/login') return null;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <motion.button
        onClick={() => setOpen(o => !o)}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={{ scale: 1.18, y: -6 }}
        whileTap={{ scale: 0.93 }}
        transition={{ type: 'spring', stiffness: 500, damping: 26 }}
        title="Notifications"
        style={{
          width: 46, height: 46, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'rgba(215, 52, 11,0.10)' : hovered ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', cursor: 'pointer',
          color: open ? '#d7340b' : hovered ? 'rgba(224, 221, 174,0.7)' : 'rgba(224, 221, 174,0.3)', transition: 'background 0.25s, color 0.25s', position: 'relative',
        }}
      >
        <Bell size={19} strokeWidth={1.5} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 8, right: 8, minWidth: 15, height: 15, padding: '0 4px', borderRadius: 999, background: '#d7340b', color: '#fff', fontSize: 8.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', boxShadow: '0 0 8px rgba(215, 52, 11,0.6)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 12, width: 320, maxWidth: '92vw', background: 'rgba(12,12,12,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, boxShadow: '0 28px 70px rgba(0,0,0,0.7)', overflow: 'hidden', zIndex: 20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
                Notifications{unread > 0 ? ` · ${unread} new` : ''}
              </span>
              {unread > 0 && (
                <button onClick={allRead} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1, cursor: 'pointer' }}>
                  <Check size={11} /> MARK ALL
                </button>
              )}
            </div>

            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {items.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11.5, fontFamily: 'var(--mono)' }}>
                  <Bell size={22} style={{ opacity: 0.3, marginBottom: 8 }} /><br />You&apos;re all caught up.
                </div>
              ) : items.map(n => (
                <div
                  key={n.id}
                  onClick={() => openItem(n)}
                  style={{ display: 'flex', gap: 10, padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: n.link ? 'pointer' : 'default', background: n.read ? 'transparent' : 'rgba(215, 52, 11,0.05)', position: 'relative' }}
                >
                  {!n.read && <span style={{ position: 'absolute', left: 5, top: 17, width: 5, height: 5, borderRadius: '50%', background: '#d7340b' }} />}
                  <div style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
                    <div style={{ fontSize: 12, color: 'var(--fg)', fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>}
                    <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: 'var(--mono)', letterSpacing: 1 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  <button onClick={(e) => clearOne(e, n.id)} title="Dismiss" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', flexShrink: 0, height: 'fit-content' }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
