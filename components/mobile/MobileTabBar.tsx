'use client';

// The island on a phone (design-language.md). One pill at the foot, where the
// tab bar was: where you are (the project, the page, an unread dot) and, beside
// it, Capture — the one thing people do on set, kept a single tap away. The
// pill opens a sheet: Today, Projects and the Lounge, whatever the page in view
// offers ("On this page"), search, every tool and the project to work on, so
// nothing on the desk is out of reach. Phone widths only (CSS); the pill
// slides away while typing so the keyboard gets the room.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sun, FolderOpen, Search, MessageSquare, X, FileText, LayoutGrid, Briefcase, Users, Film, Music,
  User, Settings, Bell, Plus, ChevronLeft, type LucideIcon,
} from 'lucide-react';
import { useProject, useSession } from '@/lib/os';
import { usePill } from '@/lib/os/PillContext';
import { islandRoute } from '@/lib/island/routes';
import { useIslandCondition } from '@/lib/island/useIslandCondition';
import { getLoungeUnread } from '@/lib/supabase/messages';
import { readable } from '@/lib/util/color';
import { CaptureSheet, fromShare, useOutbox, type CaptureStart } from './Capture';
import m from './mobile.module.css';
import { useOnChange } from '@/lib/hooks/useOnChange';
import { useLocationSearch } from '@/lib/hooks/useSearchParam';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

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

const PLACES: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: '/today', label: 'Today', icon: Sun, match: (p) => p === '/today' },
  { href: '/projects', label: 'Projects', icon: FolderOpen, match: (p) => p.startsWith('/projects') || p.startsWith('/studio') || p.startsWith('/editor') },
  { href: '/lounge', label: 'Lounge', icon: MessageSquare, match: (p) => p.startsWith('/lounge') },
];

function MoreSheet({ onClose, unread }: { onClose: () => void; unread: number }) {
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

        <nav className={`${m.grid} ${m.places}`} aria-label="Places">
          {PLACES.map(({ href, label, icon: Icon, match }) => {
            const on = match(pathname);
            return (
              <Link key={href} href={href} prefetch={false} className={`${m.tile} ${on ? m.tileOn : ''}`} aria-current={on ? 'page' : undefined} onClick={onClose}>
                <Icon size={20} className={m.tileIcon} aria-hidden />
                {label}
                {label === 'Lounge' && unread > 0 && <span className={m.tileBadge} aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>}
              </Link>
            );
          })}
        </nav>

        <button type="button" className={m.row} onClick={() => { onClose(); window.dispatchEvent(new Event('mc-open-command-palette')); }}>
          <Search size={18} className={m.tileIcon} aria-hidden /> Search everything
        </button>

        <p className={m.section}>Tools</p>
        <nav className={m.grid} aria-label="Tools">
          {TOOLS.map(({ href, label, icon: Icon }) => {
            // A link to a place on a page (Updates → Today) isn't "where you are" when you're on the page.
            const on = !href.includes('#') && pathname.startsWith(href);
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
  // Only on a phone: on a desk the page would otherwise hold a hidden copy of the project's name.
  const phone = useMediaQuery('(max-width: 760px)');
  const { activeProject } = useProject();
  const { activeDescriptor } = usePill();

  useOnChange(pathname, () => { setMore(false); setCapturing(false); });
  // The home-screen shortcut and the share menu land on Today with what to
  // capture: open Capture with it, then tidy the address.
  const search = useLocationSearch();
  const shared = useMemo(() => (authed && pathname === '/today' ? fromShare(new URLSearchParams(search)) : null), [authed, pathname, search]);
  const sharedKey = shared ? search : '';
  // Open each share once — including one already in the address when this mounts.
  const [handledShare, setHandledShare] = useState('');
  if (sharedKey && shared && sharedKey !== handledShare) {
    setHandledShare(sharedKey);
    setStart(shared);
    setCapturing(true);
  } else if (!sharedKey && handledShare) {
    setHandledShare(''); // the address is tidied: the same share can come again
  }
  useEffect(() => { if (sharedKey) history.replaceState(history.state, '', '/today'); }, [sharedKey]);
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

  const condition = useIslandCondition();
  if (!authed || !phone || hiddenOn(pathname)) return null;

  const route = islandRoute(pathname, !!activeProject);
  const place = activeDescriptor?.title || route.title;

  return (
    <>
      <nav className={`${m.pill} ${keyboard ? m.hidden : ''}`} aria-label="Suite" data-mobile-tabbar>
        {route.back && (
          <Link href={route.back.href} className={m.pillBack} aria-label={`Back to ${route.back.label}`}><ChevronLeft size={20} aria-hidden /></Link>
        )}
        <button type="button" className={m.pillMain} aria-expanded={more} aria-haspopup="dialog" onClick={() => setMore(true)}
          aria-label={`Menu. ${activeProject?.title ? `${activeProject.title}, ` : ''}${place}${unread ? `, ${unread} unread` : ''}`}>
          <span className={m.pillDot} style={{ background: activeProject?.accent_color || 'var(--accent)' }} aria-hidden />
          <span className={m.pillText}>
            {activeProject?.title && <b>{activeProject.title}</b>}
            <span>{place}</span>
            {condition.label && <span className={m.pillCondition} data-kind={condition.kind} role="status">{condition.label}</span>}
          </span>
          {unread > 0 && <span className={m.pillUnread} aria-hidden>{unread > 99 ? '99+' : unread}</span>}
        </button>
        <button type="button" className={m.pillCapture} aria-haspopup="dialog" aria-expanded={capturing} aria-label="Capture" onClick={() => { setStart(null); setCapturing(true); }}>
          <Plus size={22} aria-hidden />
          {waiting > 0 && <span className={m.pillWaiting} aria-label={`${waiting} waiting to send`}>{waiting}</span>}
        </button>
      </nav>
      {more && <MoreSheet onClose={() => setMore(false)} unread={unread} />}
      {capturing && <CaptureSheet start={start} onClose={() => setCapturing(false)} />}
    </>
  );
}
