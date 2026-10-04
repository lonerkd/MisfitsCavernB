'use client';

// The island: the suite's one piece of chrome at desk size. A single floating
// surface at the foot of the screen that takes the shape of what you're doing —
// a quiet pill saying where you are; the controls of whatever the pointer is on;
// the whole suite when you reach for it; a keyboard deck under Caps Lock; a dot
// while you type. Which shape, and why: lib/island/mode.

import React, { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Sun, FileText, LayoutGrid, MessageSquare, Briefcase, FolderOpen, User, Settings, Search, Check, Columns2, Compass } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { splitHref } from '@/lib/split/pane';
import { useProject } from '@/lib/os';
import { usePill } from '@/lib/context/PillContext';
import { getProjectModules, type EcosystemModules } from '@/lib/types/settings';
import { islandMode, isDeck, isEditable, isTypingKey } from '@/lib/island/mode';
import { CONTROL_KEYS, islandRoute, type IslandApp } from '@/lib/island/routes';
import { ISLAND_SCALE_EVENT, islandReserve, readIslandScale } from '@/lib/island/scale';
import { readable } from '@/lib/color';
import NotificationBell from './NotificationBell';
import dynamic from 'next/dynamic';
import s from './island/island.module.css';
import { useOnChange } from '@/lib/hooks/useOnChange';

const GlobalAudioWidget = dynamic(() => import('@/components/GlobalAudioWidget'), { ssr: false });

const APPS: { id: IslandApp; name: string; icon: typeof Home; path: string; color: string; module?: keyof EcosystemModules }[] = [
  { id: 'home',      name: 'Hub',       icon: Home,          path: '/',          color: 'var(--accent)' },
  { id: 'today',     name: 'Today',     icon: Sun,           path: '/today',     color: 'var(--warn)' },
  { id: 'editor',    name: 'ScriptOS',  icon: FileText,      path: '/editor',    color: 'var(--accent)', module: 'scriptos' },
  { id: 'studio',    name: 'Studio',    icon: LayoutGrid,    path: '/studio',    color: 'var(--violet)', module: 'studio' },
  { id: 'lounge',    name: 'Lounge',    icon: MessageSquare, path: '/lounge',    color: 'var(--ok)', module: 'lounge' },
  { id: 'portfolio', name: 'Portfolio', icon: Briefcase,     path: '/portfolio', color: 'var(--warn)', module: 'portfolio' },
];

const MORPH = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } as const;
/** How close the pointer gets before the island leans in. */
const NEAR = 90;
const LEAVE_MS = 260;
/** After the pill opens under the pointer, a click where the pill was still means "open", not whatever slid in there. */
const ARRIVE_MS = 700;
const TYPING_MS = 2500;

interface Control {
  id: string;
  kind: 'toggle' | 'action' | 'link';
  label: string;
  active?: boolean;
  href?: string;
  run: () => void;
}

function ProjectSwitcher({ onClose }: { onClose: () => void }) {
  const { projects, activeProject, setActiveProject } = useProject();
  const router = useRouter();
  return (
    <motion.div
      // x centres it over its button (a CSS transform here would be overwritten by the animation).
      initial={{ opacity: 0, x: '-50%', y: 10, scale: 0.95 }}
      animate={{ opacity: 1, x: '-50%', y: 0, scale: 1 }}
      exit={{ opacity: 0, x: '-50%', y: 10, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        marginBottom: 14,
        background: 'var(--surface)',
        backdropFilter: 'blur(28px)',
        border: '1px solid rgba(var(--ink-rgb), 0.08)',
        borderRadius: 14,
        padding: 10,
        width: 220,
        maxHeight: 'min(60vh, 420px)',
        overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
        zIndex: 10,
      }}
    >
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2.5,
        textTransform: 'uppercase', color: 'var(--fg-dim)',
        padding: '4px 8px 8px',
        borderBottom: '1px solid rgba(var(--ink-rgb), 0.05)',
        marginBottom: 6,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        Projects
        <Link href="/projects" prefetch={false} onClick={onClose} style={{
          color: 'rgba(232, 67, 26,0.7)', textDecoration: 'none', fontSize: 11,
          letterSpacing: 1.5,
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--accent)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(232, 67, 26,0.7)')}
        >
          All →
        </Link>
      </div>

      {projects.length === 0 && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', padding: '10px 8px', letterSpacing: 1 }}>
          No projects yet.
        </div>
      )}
      {projects.map((proj, i) => {
        const color = proj.accent_color || 'var(--accent)';
        const isActive = activeProject?.id === proj.id;
        return (
          <motion.div
            key={proj.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => { setActiveProject(proj); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 8px', borderRadius: 8, cursor: 'pointer',
              background: isActive ? 'rgba(var(--ink-rgb), 0.06)' : 'transparent',
              transition: 'background 0.2s',
            }}
            whileHover={{ background: 'rgba(var(--ink-rgb), 0.05)' } as any}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: '0.78rem', letterSpacing: 1, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {proj.title}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5, color: 'var(--fg-dim)', textTransform: 'uppercase' }}>
                {proj.status || 'project'}
              </div>
            </div>
            {isActive && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, color: color, flexShrink: 0 }}>ACTIVE</div>}
            <button
              onClick={(e) => { e.stopPropagation(); setActiveProject(proj); onClose(); router.push(`/projects/${proj.id}`); }}
              aria-label="open hub"
              style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
            >›</button>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

const Key = ({ children }: { children: React.ReactNode }) => <kbd className={s.key} aria-hidden>{children}</kbd>;

export default function EcosystemTaskbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeProject } = useProject();
  const { activeDescriptor, zoneActive, zoneChain, transient, kbActive, clearPin, emit } = usePill();

  const noDock = pathname === '/login' || pathname === '/auth' || pathname === '/privacy' || pathname === '/terms'
    // The split screen has its own bar; each pane is a full page without chrome.
    || pathname === '/split'
    // Public share surfaces (lookbooks, public portfolios, shared scripts) are
    // for people outside the app — no app chrome over them.
    || /^\/(shared|p|s)\//.test(pathname);

  // Publish the room the island takes at rest as --taskbar-height. Pages no
  // longer end above a full-width band: scrolling pages pad their end by it,
  // and full-height ones (Lounge, editor) lift only the column it sits over.
  // It stays put while the island opens — that overlays, it doesn't reflow.
  // 0 where there is no island (phones use the tab bar).
  const dockRef = useRef<HTMLElement>(null);
  // Its size is this device's choice (Settings › Island size); it follows the slider as it moves.
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const read = () => setScale(readIslandScale());
    read();
    window.addEventListener(ISLAND_SCALE_EVENT, read);
    window.addEventListener('storage', read);
    return () => { window.removeEventListener(ISLAND_SCALE_EVENT, read); window.removeEventListener('storage', read); };
  }, []);
  useEffect(() => {
    const el = dockRef.current;
    const root = document.documentElement;
    if (noDock || !el) { root.style.setProperty('--taskbar-height', '0px'); return; }
    const publish = () => root.style.setProperty('--taskbar-height', `${el.offsetHeight ? islandReserve(scale) : 0}px`);
    publish();
    window.addEventListener('resize', publish);
    return () => { window.removeEventListener('resize', publish); root.style.removeProperty('--taskbar-height'); };
  }, [noDock, scale]);

  const projectSettings = activeProject?.settings;
  const visibleApps = useMemo(() => {
    const modules = getProjectModules(projectSettings);
    return APPS.filter(app => !app.module || modules[app.module]);
  }, [projectSettings]);

  // ── What the person is doing ─────────────────────────────────────────────
  const islandRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrival = useRef<{ at: number; pill: DOMRect } | null>(null);
  const swallowClick = useRef(false);
  const [hover, setHover] = useState(false);
  const [held, setHeld] = useState(false);       // a menu of the island's is open
  const [kbFocus, setKbFocus] = useState(false); // keyboard focus is inside
  const [pinned, setPinned] = useState(false);   // opened with the dot
  const [near, setNear] = useState(false);
  const [typing, setTyping] = useState(false);
  const [capsDismissed, setCapsDismissed] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [kbFocusIndex, setKbFocusIndex] = useState(-1);

  const mode = islandMode({
    caps: kbActive, capsDismissed, typing,
    engaged: hover || held || kbFocus || pinned || projectsOpen,
    zone: zoneActive, live: !!transient,
  });
  const deck = isDeck(mode);
  /** Every control on the deck answers to a key while Caps Lock is on. */
  const keys = deck && kbActive && !capsDismissed;

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);
  useOnChange(kbActive, (on) => { if (!on) setCapsDismissed(false); });

  // A new page: put the island away.
  useOnChange(pathname, () => { setProjectsOpen(false); setPinned(false); setHeld(false); setKbFocus(false); });
  useEffect(() => {
    clearPin();
    const active = document.activeElement as HTMLElement | null;
    if (active && islandRef.current?.contains(active)) active.blur();
  }, [pathname, clearPin]);

  // Clicking away closes whatever the island had open.
  useEffect(() => {
    if (!projectsOpen && !held && !pinned) return;
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-taskbar]')) return;
      setProjectsOpen(false); setHeld(false); setPinned(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [projectsOpen, held, pinned]);

  // Typing shrinks it to a dot; it comes back when the keys stop.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onKey = (e: KeyboardEvent) => {
      if (!isTypingKey(e)) return;
      setTyping(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setTyping(false), TYPING_MS);
    };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); if (timer) clearTimeout(timer); };
  }, []);

  // It leans in as the pointer comes close.
  useEffect(() => {
    if (noDock) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame || e.pointerType === 'touch') return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = islandRef.current?.getBoundingClientRect();
        if (!r) return;
        const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
        const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
        setNear(Math.hypot(dx, dy) < NEAR);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); if (frame) cancelAnimationFrame(frame); };
  }, [noDock]);

  // Switching project is worth a word.
  const lastProject = useRef<string | null>(null);
  const projectId = activeProject?.id ?? null;
  const projectTitle = activeProject?.title;
  useEffect(() => {
    // From one project to another — not the first one arriving as the page loads.
    if (lastProject.current && projectId && lastProject.current !== projectId) emit(`Now in ${projectTitle}`, 'accent');
    lastProject.current = projectId;
  }, [projectId, projectTitle, emit]);

  // ── What it has to offer here ────────────────────────────────────────────
  const route = useMemo(() => islandRoute(pathname, !!activeProject), [pathname, activeProject]);
  const pathApp = APPS.find(a => (a.path !== '/' ? pathname.startsWith(a.path) : pathname === '/'));
  const app = pathApp ?? APPS.find(a => a.id === route.app);
  const Glyph = app?.icon ?? Compass;
  // The accent is text here (chips, the lead number), so a project's own colour is nudged until it reads.
  const accent = readable(activeDescriptor?.accent ?? app?.color ?? 'var(--accent)');
  const title = activeDescriptor?.title || route.title;
  const fields = activeDescriptor?.fields ?? [];
  const lead = fields[0];

  const controls = useMemo<Control[]>(() => {
    const inReach = new Set([...visibleApps.map(a => a.path), '/profile', '/settings']);
    return [
      ...(activeDescriptor?.toggles ?? []).map((t): Control => ({ id: t.id, kind: 'toggle', label: t.label, active: t.active, run: t.onToggle })),
      ...(activeDescriptor?.actions ?? []).map((a): Control => ({ id: a.id, kind: 'action', label: a.label, run: a.onClick })),
      // Places the strip below doesn't already reach.
      ...route.links.filter(l => !inReach.has(l.href)).map((l): Control => ({ id: l.id, kind: 'link', label: l.label, href: l.href, run: () => router.push(l.href) })),
    ].slice(0, CONTROL_KEYS.length);
  }, [activeDescriptor, route, visibleApps, router]);

  useOnChange(keys, (k) => { if (!k) setKbFocusIndex(-1); });
  useOnChange(controls.length, () => setKbFocusIndex(-1));
  const focusedId = kbFocusIndex >= 0 ? controls[kbFocusIndex]?.id ?? null : null;

  const openSearch = () => window.dispatchEvent(new Event('mc-open-command-palette'));
  const openSplit = () => router.push(splitHref(window.location.pathname + window.location.search));

  // ── The Caps Lock layer: the deck, on keys ───────────────────────────────
  const onDeckKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
    const key = e.key.toLowerCase();
    const done = () => { e.preventDefault(); };

    if (key === 'escape') { done(); setCapsDismissed(true); setProjectsOpen(false); return; }
    if (key >= '1' && key <= '9') {
      const target = visibleApps[parseInt(key, 10) - 1];
      if (target) { done(); router.push(target.path); }
      return;
    }
    if (key === '/') { done(); openSearch(); return; }
    if (key === '\\') { done(); openSplit(); return; }
    if (key === 'p') { done(); setProjectsOpen(v => !v); return; }

    const byKey = controls[CONTROL_KEYS.indexOf(key as typeof CONTROL_KEYS[number])];
    if (byKey) { done(); byKey.run(); return; }

    if (!controls.length) return;
    if (key === 'arrowright' || key === ']') { done(); setKbFocusIndex(i => (i + 1) % controls.length); return; }
    if (key === 'arrowleft' || key === '[') { done(); setKbFocusIndex(i => (i - 1 + controls.length) % controls.length); return; }
    if (key === 'enter' && kbFocusIndex >= 0 && controls[kbFocusIndex]) { done(); controls[kbFocusIndex].run(); }
  });
  useEffect(() => {
    if (noDock || !kbActive || capsDismissed) return;
    const handler = (e: KeyboardEvent) => onDeckKey(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [noDock, kbActive, capsDismissed]);

  if (noDock) return null;

  const onEnter = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (!deck && islandRef.current) arrival.current = { at: performance.now(), pill: islandRef.current.getBoundingClientRect() };
    setHover(true);
    setTyping(false);
  };
  // The pill opens as the pointer arrives, and its controls land where the pill was. A press
  // aimed at the pill must not land on one of them: it keeps the island open instead. (On
  // pointer-down, because the pill re-renders under the pointer and the browser then drops the click.)
  const arriving = (e: { clientX: number; clientY: number }) => {
    const a = arrival.current;
    if (!a) return false;
    const { pill } = a;
    const inside = e.clientX >= pill.left && e.clientX <= pill.right && e.clientY >= pill.top && e.clientY <= pill.bottom;
    if (!inside || performance.now() - a.at > ARRIVE_MS) { arrival.current = null; return false; }
    return true;
  };
  const onPress = (e: React.PointerEvent) => {
    swallowClick.current = false;
    if (e.pointerType === 'touch' || e.button !== 0 || !arriving(e)) return;
    arrival.current = null;
    swallowClick.current = true;
    setPinned(true);
  };
  const onPressedClick = (e: React.MouseEvent) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };
  const onLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      // A menu left open (notifications, audio) keeps the island open until you click away.
      if (navRef.current?.querySelector('[aria-expanded="true"]')) setHeld(true);
      setHover(false);
    }, LEAVE_MS);
  };
  const close = () => {
    setPinned(false); setHeld(false); setProjectsOpen(false); setKbFocus(false);
    const active = document.activeElement as HTMLElement | null;
    if (active && islandRef.current?.contains(active)) active.blur();
  };

  const renderControl = (c: Control, i: number) => {
    const hint = keys ? <Key>{CONTROL_KEYS[i]}</Key> : null;
    const kb = focusedId === c.id ? 'true' : undefined;
    if (c.kind === 'toggle') {
      return (
        <button key={c.id} type="button" className={s.toggle} aria-pressed={!!c.active} data-kb={kb} onClick={c.run}>
          <span className={s.check}>{c.active && <Check size={10} strokeWidth={3} aria-hidden />}</span>
          {c.label}{hint}
        </button>
      );
    }
    if (c.kind === 'link') {
      return <Link key={c.id} href={c.href!} prefetch={false} className={`${s.chip} ${s.chipQuiet}`} data-kb={kb}>{c.label}{hint}</Link>;
    }
    return <button key={c.id} type="button" className={s.chip} data-kb={kb} onClick={c.run}>{c.label}{hint}</button>;
  };

  const renderFields = (max: number) => fields.slice(0, max).map(f => (
    <span key={f.label} className={s.field}>
      <small>{f.label}</small>
      <span style={f.color ? { color: readable(f.color) } : undefined}>{f.value}</span>
    </span>
  ));

  const crumbs = zoneChain.length > 1 ? (
    <span className={s.crumbs}>
      {zoneChain.map((z, i) => (
        <React.Fragment key={`${z.depth}-${z.title}`}>
          {i === zoneChain.length - 1 ? <b>{z.title}</b> : <><span>{z.title}</span><span aria-hidden>›</span></>}
        </React.Fragment>
      ))}
    </span>
  ) : null;

  // On the deck, everything; over a page zone, just what acts on it (the links are a pointer-trip away anyway).
  const shown = deck ? controls : controls.filter(c => c.kind !== 'link');
  const hasControls = (deck || mode === 'context') && (fields.length > 0 || shown.length > 0);

  return (
    <nav ref={dockRef} aria-label="Suite" className={`mc-dock ${s.dock}`} data-taskbar data-island={mode} style={{ '--island-scale': scale } as React.CSSProperties}>
      <motion.div
        layoutRoot
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', justifyContent: 'center', maxWidth: '100%' }}
      >
        <motion.div
          ref={islandRef}
          layout
          transition={MORPH}
          className={`mc-taskbar ${s.island}`}
          data-mode={mode}
          data-deck={deck}
          data-near={near && !deck && mode !== 'dot'}
          style={{ borderRadius: 28, '--island-accent': accent } as React.CSSProperties}
          onPointerEnter={onEnter}
          onPointerLeave={onLeave}
          onPointerDownCapture={onPress}
          onPointerMove={(e) => { if (arrival.current) arriving(e); }}
          onClickCapture={onPressedClick}
          // A click on the island itself (between its controls, or as it morphs under the pointer) keeps it open.
          onClick={(e) => { if (!(e.target as HTMLElement).closest('a, button, input')) setPinned(true); }}
          onFocusCapture={(e) => { if ((e.target as HTMLElement).matches(':focus-visible')) setKbFocus(true); }}
          onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKbFocus(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape' && deck) { e.stopPropagation(); close(); } }}
        >
          {/* The suite. Always mounted — the audio player lives here and must keep playing — and shown on the deck. */}
          <motion.div ref={navRef} layout="position" className={s.nav}>
            <span className={s.slot} data-tip="Search · ⌘K">
              <button type="button" className={s.btn} aria-label="Search (Command-K)" onClick={openSearch}>
                <Search size={18} strokeWidth={1.5} aria-hidden />{keys && <Key>/</Key>}
              </button>
            </span>
            <span className={s.slot} data-tip="Split screen · Ctrl \">
              <button type="button" className={s.btn} aria-label="Split screen (Control-Backslash)" onClick={openSplit}>
                <Columns2 size={18} strokeWidth={1.5} aria-hidden />{keys && <Key>\</Key>}
              </button>
            </span>

            <span className={s.rule} aria-hidden />

            <div className={`mc-app-strip ${s.strip}`}>
              {visibleApps.map((a, i) => {
                const Icon = a.icon;
                const isActive = pathApp?.id === a.id;
                return (
                  <span key={a.id} className={s.slot} data-tip={a.name}>
                    <Link href={a.path} prefetch={false} className={s.btn} aria-label={a.name} aria-current={isActive ? 'page' : undefined} style={{ '--btn-accent': a.color } as React.CSSProperties}>
                      <Icon size={19} strokeWidth={1.5} aria-hidden />{keys && <Key>{i + 1}</Key>}
                    </Link>
                  </span>
                );
              })}
            </div>

            <span className={s.rule} aria-hidden />

            <span className={s.slot} data-tip={activeProject ? activeProject.title : 'Projects'} data-open={projectsOpen}>
              <button
                type="button"
                className={s.btn}
                aria-label="Switch project"
                aria-haspopup="true"
                aria-expanded={projectsOpen}
                onClick={() => setProjectsOpen(v => !v)}
                style={{ '--btn-accent': activeProject?.accent_color || 'var(--accent)' } as React.CSSProperties}
              >
                <FolderOpen size={18} strokeWidth={1.5} aria-hidden />
                {activeProject && !keys && <span className={s.pip} style={{ background: activeProject.accent_color || 'var(--accent)' }} aria-hidden />}
                {keys && <Key>P</Key>}
              </button>
              <AnimatePresence>
                {projectsOpen && <ProjectSwitcher onClose={() => setProjectsOpen(false)} />}
              </AnimatePresence>
            </span>

            <span className={s.rule} aria-hidden />

            <span className={s.bell}><NotificationBell /></span>
            <div style={{ display: 'flex', alignItems: 'center', margin: '0 4px' }}>
              <GlobalAudioWidget />
            </div>

            {([
              { id: 'profile', name: 'Profile', icon: User, path: '/profile' },
              { id: 'settings', name: 'Settings', icon: Settings, path: '/settings' },
            ] as const).map(item => {
              const Icon = item.icon;
              return (
                <span key={item.id} className={s.slot} data-tip={item.name}>
                  <Link href={item.path} prefetch={false} className={s.btn} aria-label={item.name} aria-current={pathname.startsWith(item.path) ? 'page' : undefined}>
                    <Icon size={19} strokeWidth={1.5} aria-hidden />
                  </Link>
                </span>
              );
            })}
          </motion.div>

          <motion.div layout="position" className={s.main}>
            <button
              type="button"
              className={s.handle}
              aria-label={pinned ? 'Close the island' : deck ? 'Keep the island open' : `Open the island — ${title}`}
              aria-pressed={pinned}
              title={deck ? (pinned ? 'Close' : 'Keep open') : 'Everything in the suite · Caps Lock for keys'}
              onClick={() => (pinned ? close() : setPinned(true))}
            >
              <span className={s.dot} data-pinned={pinned} aria-hidden />
              {mode === 'live' && transient && <span className={s.label} role="status">{transient.label}</span>}
              {/* One slot each, so what's under the pointer survives the change of shape. */}
              {mode === 'rest' && <span className={s.glyph}><Glyph size={15} strokeWidth={1.6} aria-hidden /></span>}
              {(mode === 'rest' || mode === 'context' || deck) && ((mode !== 'rest' && crumbs) || <span className={s.title}>{title}</span>)}
              {mode === 'rest' && lead && <span className={s.lead}><small>{lead.label}</small><span style={lead.color ? { color: readable(lead.color) } : undefined}>{lead.value}</span></span>}
            </button>

            {/* What the dot is about: the page's (or the hovered thing's) numbers and controls. */}
            {hasControls && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.05 }} className={s.inline} role="group" aria-label={`${title} controls`}>
                {renderFields(deck ? 4 : 3)}
                {fields.length > 0 && shown.length > 0 && <span className={s.rule} aria-hidden />}
                {shown.map(c => renderControl(c, controls.indexOf(c)))}
              </motion.div>
            )}

          </motion.div>

          {mode === 'caps' && (
            <motion.div layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.05 }} className={s.hints}>
              <span><Key>1</Key>–<Key>{visibleApps.length}</Key> apps</span>
              {controls.length > 0 && <span><Key>Q</Key>{controls.length > 1 && <>–<Key>{CONTROL_KEYS[controls.length - 1]}</Key></>} or <Key>←</Key><Key>→</Key><Key>↵</Key> controls</span>}
              <span><Key>/</Key> search</span>
              <span><Key>\</Key> split</span>
              <span><Key>P</Key> project</span>
              <span><Key>Esc</Key> put away</span>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </nav>
  );
}
