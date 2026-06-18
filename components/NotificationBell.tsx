'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
  DBNotification,
} from '@/lib/supabase/notifications';

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DBNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [list, count] = await Promise.all([getNotifications(user.id), getUnreadCount(user.id)]);
      setItems(list);
      setUnread(count);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    const unsubscribe = subscribeToNotifications(user.id, (n) => {
      setItems(prev => [n, ...prev].slice(0, 30));
      setUnread(c => c + 1);
    });
    return unsubscribe;
  }, [user, load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  const handleOpen = () => {
    setOpen(o => !o);
  };

  const handleItemClick = async (n: DBNotification) => {
    if (!n.read) {
      setItems(prev => prev.map(i => i.id === n.id ? { ...i, read: true } : i));
      setUnread(c => Math.max(0, c - 1));
      try { await markNotificationRead(n.id); } catch (err) { console.error(err); }
    }
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    setItems(prev => prev.map(i => ({ ...i, read: true })));
    setUnread(0);
    try { await markAllNotificationsRead(user.id); } catch (err) { console.error(err); }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        style={{
          position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--fg)', opacity: 0.75, display: 'flex', alignItems: 'center', padding: 6,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.75')}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%',
            background: '#ef4444', border: '1px solid rgba(6,6,6,0.92)',
          }} />
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 10, width: 320, maxHeight: 420,
          overflowY: 'auto', background: 'rgba(10,10,10,0.98)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          zIndex: 200,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: 'var(--fg-muted)', textTransform: 'uppercase' }}>Notifications</span>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--mono)' }}>
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '28px 14px', textAlign: 'center', fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>
              NO NOTIFICATIONS YET
            </div>
          ) : (
            items.map(n => {
              const itemStyle: React.CSSProperties = {
                display: 'block', padding: '12px 14px', textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer',
                background: n.read ? 'transparent' : 'rgba(99,102,241,0.06)',
              };
              const inner = (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{n.body}</div>}
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => handleItemClick(n)} style={itemStyle}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id} onClick={() => handleItemClick(n)} style={itemStyle}>
                  {inner}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
