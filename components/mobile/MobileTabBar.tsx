'use client';

// The suite on a phone. The desktop dock has room for every app; a phone
// has room for a thumb. Five tabs cover what people do on the go — Today,
// Projects, Capture, Lounge — and More opens a sheet with everything else:
// every tool, the active project (switchable), and whatever the page in view
// offers in the desktop dock's context capsule ("On this page"), so nothing
// on desktop is out of reach here. Shown only at phone widths (CSS); the bar
// slides away while typing so the keyboard gets the room.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sun, FolderOpen, Search, MessageSquare, Grid2x2, X, FileText, LayoutGrid, Briefcase, Users, Film, Music,
  User, Settings, Bell, Plus, type LucideIcon,
} from 'lucide-react';
import { useProject, useSession } from '@/lib/os';
import { usePill } from '@/lib/context/PillContext';
import { getLoungeUnread } from '@/lib/supabase/messages';
import { readable } from '@/lib/color';
import { CaptureSheet, fromShare, useOutbox, type CaptureStart } from './Capture';
import m from './mobile.module.css';

const TOOLS = [
  { href: '/editor', label: 'Script', icon: FileText },
  { href: '/studio', label: 'Studio', icon: LayoutGrid },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/crew', label: 'Crew', icon: Users },
  { href: '/portfolio', label: 'Portfolio', icon: Film },
  { href: '/soundtrack', label: 'Soundtrack', icon: Music },
  { href: '/today#updates', label: 'Updates', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

/** Pages that are the whole screen, or for people outside the suite. */
const hiddenOn = (path: string) => path === '/auth' || path === '/login' || path === '/privacy' || path === '/terms' || path === '/split' || path.startsWith('/editor') || /^\/(shared|p|s|call)\//.test(path);

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      const field = !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'range', 'color', 'file'].includes((el as HTMLInputElement).type)));
      setOpen(field);
    };
    const left = () => setTimeout(typing, 0);
    document.addEventListener('focusin', typing);
    document.addEventListener('focusout', left);
    return () => { document.removeEventListener('focusin', typing); document.removeEventListener('focusout', left); };
  }, []);
  return open;
}

function MoreSheet({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { projects, activeProject, setActiveProject } = useProject();
  const { activeDescriptor } = usePill();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [onClose]);

  const toggles = activeDescriptor?.toggles ?? [];
  const actions = activeDescriptor?.actions ?? [];

  return createPortal(
    <>
      <div className={m.scrim} onClick={onClose} aria-hidden />
      <div className={m.sheet} role="dialog" aria-modal="true" aria-labelledby="mc-more-title">
        <div className={m.grip} aria-hidden />
        <div className={m.sheetHead}>
          <h2 id="mc-more-title" className={m.sheetTitle}>Everything</h2>
          <button ref={closeRef} type="button" className={m.close} onClick={onClose} aria-label="Close"><X size={18} aria-hidden /></button>
        </div>

        {(toggles.length > 0 || actions.length > 0) && (
          <>
            <p className={m.section}>On this page{activeDescriptor?.title ? ` · ${activeDescriptor.title}` : ''}</p>
            <div className={m.list}>
              {toggles.map((t) => (
                <button key={t.id} type="button" className={`${m.row} ${m.pageAction}`} aria-pressed={t.active} onClick={() => t.onToggle()}>
                  <span>{t.label}</span><span className={t.active ? m.toggleOn : m.rowMeta}>{t.active ? 'On' : 'Off'}</span>
                </button>
              ))}
              {actions.map((a) => (
                <button key={a.id} type="button" className={m.row} onClick={() => { a.onClick(); onClose(); }}>{a.label}</button>
              ))}
            </div>
          </>
        )}

        <button type="button" className={m.row} onClick={() => { onClose(); window.dispatchEvent(new Event('mc-open-command-palette')); }}>
          <Search size={18} className={m.tileIcon} aria-hidden /> Search everything
        </button>

        <p className={m.section}>Tools</p>
        <nav className={m.grid} aria-label="Tools">
          {TOOLS.map(({ href, label, icon: Icon }) => {
            const on = pathname.startsWith(href.split('#')[0]);
            return (
              <Link key={href} href={href} prefetch={false} className={`${m.tile} ${on ? m.tileOn : ''}`} aria-current={on ? 'page' : undefined} onClick={onClose}>
                <Icon size={20} className={m.tileIcon} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        {projects.length > 0 && (
          <>
            <p className={m.section}>Working on</p>
            <div className={m.list} role="radiogroup" aria-label="Active project">
              {projects.map((p) => {
                const on = p.id === activeProject?.id;
                return (
                  <button key={p.id} type="button" role="radio" aria-checked={on} className={`${m.row} ${on ? m.rowOn : ''}`} onClick={() => { void setActiveProject(p); }}>
                    <span className={m.dot} style={{ background: p.accent_color || 'var(--accent)' }} aria-hidden />
                    <span style={{ color: on ? readable(p.accent_color || '#e8431a') : undefined }}>{p.title}</span>
                    {on && <span className={m.rowMeta}>Active</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const { status } = useSession();
  const keyboard = useKeyboardOpen();
  const [more, setMore] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [start, setStart] = useState<CaptureStart | null>(null);
  const waiting = useOutbox().length;
  const [unread, setUnread] = useState(0);
  const authed = status === 'authed';

  useEffect(() => { setMore(false); setCapturing(false); }, [pathname]);
  // The home-screen shortcut and the share menu land on Today with what to
  // capture: open Capture with it, then tidy the address.
  useEffect(() => {
    if (!authed || pathname !== '/today') return;
    const shared = fromShare(new URLSearchParams(location.search));
    if (!shared) return;
    setStart(shared);
    setCapturing(true);
    history.replaceState(history.state, '', '/today');
  }, [authed, pathname]);
  useEffect(() => {
    if (!authed) return;
    let live = true;
    const load = () => getLoungeUnread().then((u) => {
      if (live) setUnread([...Object.values(u.channels), ...Object.values(u.people)].reduce((a, b) => a + b, 0));
    }).catch(() => {});
    load();
    window.addEventListener('focus', load);
    const t = setInterval(load, 60_000);
    return () => { live = false; window.removeEventListener('focus', load); clearInterval(t); };
  }, [authed, pathname]);

  if (!authed || hiddenOn(pathname)) return null;

  const tab = (href: string, label: string, Icon: LucideIcon, match: (p: string) => boolean, badge?: number) => {
    const on = match(pathname);
    return (
      <Link href={href} prefetch={false} className={`${m.tab} ${on ? m.on : ''}`} aria-current={on ? 'page' : undefined}>
        <Icon size={21} aria-hidden />
        {label}
        {!!badge && <span className={m.badge} aria-label={`${badge} unread`}>{badge > 99 ? '99+' : badge}</span>}
      </Link>
    );
  };

  return (
    <>
      <nav className={`${m.bar} ${keyboard ? m.hidden : ''}`} aria-label="Suite" data-mobile-tabbar>
        {tab('/today', 'Today', Sun, (p) => p === '/today')}
        {tab('/projects', 'Projects', FolderOpen, (p) => p.startsWith('/projects') || p.startsWith('/studio') || p.startsWith('/editor'))}
        <button type="button" className={`${m.tab} ${m.captureTab}`} aria-haspopup="dialog" aria-expanded={capturing} onClick={() => { setStart(null); setCapturing(true); }}>
          <span className={m.captureDisc}><Plus size={22} aria-hidden /></span>
          Capture
          {waiting > 0 && <span className={m.badge} aria-label={`${waiting} waiting to send`}>{waiting}</span>}
        </button>
        {tab('/lounge', 'Lounge', MessageSquare, (p) => p.startsWith('/lounge'), unread)}
        <button type="button" className={`${m.tab} ${more ? m.on : ''}`} aria-expanded={more} aria-haspopup="dialog" onClick={() => setMore(true)}>
          <Grid2x2 size={21} aria-hidden />
          More
        </button>
      </nav>
      {more && <MoreSheet onClose={() => setMore(false)} />}
      {capturing && <CaptureSheet start={start} onClose={() => setCapturing(false)} />}
    </>
  );
}
