'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, FileText, LayoutGrid, MessageSquare, Briefcase, ChevronUp, FolderOpen, User, Settings, Search, Check } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useProject } from '@/lib/context/ProjectContext';
import { usePill, type PillDescriptor } from '@/lib/context/PillContext';
import { getProjectModules, type EcosystemModules } from '@/lib/types/settings';
import NotificationBell from './NotificationBell';
import dynamic from 'next/dynamic';

const GlobalAudioWidget = dynamic(() => import('@/components/GlobalAudioWidget'), { ssr: false });

const APPS = [
  { id: 'home',      name: 'Hub',       icon: Home,          path: '/',          color: '#d7340b' },
  { id: 'editor',    name: 'ScriptOS',  icon: FileText,      path: '/editor',    color: '#d7340b', module: 'scriptos' as const },
  { id: 'studio',    name: 'Studio',    icon: LayoutGrid,    path: '/studio',    color: '#6366f1', module: 'studio' as const },
  { id: 'lounge',    name: 'Lounge',    icon: MessageSquare, path: '/lounge',    color: '#10b981', module: 'lounge' as const },
  { id: 'portfolio', name: 'Portfolio', icon: Briefcase,     path: '/portfolio', color: '#f59e0b', module: 'portfolio' as const },
];

const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const;
const MORPH = { duration: 0.4, ease: [0.16, 1, 0.3, 1] } as const;

function ProjectSwitcher({ onClose }: { onClose: () => void }) {
  const { projects, activeProject, setActiveProject } = useProject();
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 10,
        background: 'rgba(5, 10, 18, 0.96)',
        backdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 10,
        width: 220,
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 2.5,
        textTransform: 'uppercase', color: 'rgba(224, 221, 174,0.3)',
        padding: '4px 8px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        marginBottom: 6,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        Projects
        <Link href="/projects" onClick={onClose} style={{
          color: 'rgba(215, 52, 11,0.7)', textDecoration: 'none', fontSize: 7,
          letterSpacing: 1.5,
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#d7340b')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(215, 52, 11,0.7)')}
        >
          All →
        </Link>
      </div>

      {/* Project list — real, sets the global active project */}
      {projects.length === 0 && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'rgba(224, 221, 174,0.3)', padding: '10px 8px', letterSpacing: 1 }}>
          No projects yet.
        </div>
      )}
      {projects.map((proj, i) => {
        const color = proj.accent_color || '#d7340b';
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
              padding: '8px 8px', borderRadius: 10, cursor: 'pointer',
              background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
              transition: 'background 0.2s',
            }}
            whileHover={{ background: 'rgba(255,255,255,0.05)' } as any}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: '0.78rem', letterSpacing: 1, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {proj.title}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 7, letterSpacing: 1.5, color: 'rgba(224, 221, 174,0.3)', textTransform: 'uppercase' }}>
                {proj.status || 'project'}
              </div>
            </div>
            {isActive && <div style={{ fontFamily: 'var(--mono)', fontSize: 6.5, letterSpacing: 1, color: color, flexShrink: 0 }}>ACTIVE</div>}
            <button
              onClick={(e) => { e.stopPropagation(); setActiveProject(proj); onClose(); router.push(`/projects/${proj.id}`); }}
              aria-label="open hub"
              style={{ background: 'none', border: 'none', color: 'rgba(224, 221, 174,0.3)', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
            >›</button>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ── Transient activity (Dynamic-Island live event) ────────────────────────
function TransientView({ label, tone }: { label: string; tone: 'default' | 'success' | 'accent' }) {
  const color = tone === 'success' ? '#10b981' : tone === 'accent' ? '#d7340b' : 'rgba(224, 221, 174,0.8)';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={SPRING}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', whiteSpace: 'nowrap' }}
    >
      <motion.span
        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }}
      />
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1.5,
        textTransform: 'uppercase', color: 'var(--fg)',
      }}>
        {label}
      </span>
    </motion.div>
  );
}

// ── Context capsule — the live module context, budded off the dock like a
// Dynamic-Island activity. Collapsed it's a glanceable beacon + lead read-out;
// expanded (on hover, an in-page zone, or the armed keyboard layer) it blooms
// into the full strip of live fields, real toggles and real actions. Every
// control here is wired — a toggle flips genuine page state, never decoration.
function ContextCapsule({
  descriptor, accent, expanded, zoneChain, kbActive, focusedId,
}: {
  descriptor: PillDescriptor;
  accent: string;
  expanded: boolean;
  zoneChain: { depth: number; title: string }[];
  kbActive: boolean;
  focusedId: string | null;
}) {
  const { title, fields = [], toggles = [], actions = [] } = descriptor;
  const lead = fields[0];
  const hasStrip = fields.length > 0 || toggles.length > 0 || actions.length > 0;
  const showBreadcrumb = expanded && zoneChain.length > 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, pointerEvents: 'auto' }}>
      {/* Depth cues — the hovered nesting path, shallow → deep. */}
      <AnimatePresence>
        {showBreadcrumb && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 14,
              fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 0.8,
              color: 'rgba(224, 221, 174,0.35)', whiteSpace: 'nowrap', pointerEvents: 'none',
            }}
          >
            {zoneChain.map((z, i) => {
              const isLast = i === zoneChain.length - 1;
              return (
                <React.Fragment key={`${z.depth}-${z.title}`}>
                  <span style={{ color: isLast ? accent : 'rgba(224, 221, 174,0.35)' }}>{z.title}</span>
                  {!isLast && <span style={{ color: 'rgba(224, 221, 174,0.18)' }}>›</span>}
                </React.Fragment>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.85, x: -10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.85, x: -10 }}
        transition={MORPH}
        style={{
          display: 'flex', alignItems: 'center', gap: expanded ? 12 : 8,
          height: 52, padding: expanded ? '0 16px 0 13px' : '0 14px',
          borderRadius: 26, position: 'relative', overflow: 'hidden', whiteSpace: 'nowrap',
          background: 'rgba(8, 8, 8, 0.85)',
          backdropFilter: 'blur(28px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
          border: `1px solid ${accent}40`,
          boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 22px ${accent}20, inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        {/* Live beacon — the "active" pulse */}
        <motion.span
          layout
          animate={{ scale: [1, 1.3, 1], opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 8, height: 8, borderRadius: '50%', background: accent,
            boxShadow: `0 0 10px ${accent}`, flexShrink: 0,
          }}
        />

        {/* Collapsed: a single glanceable read-out keeps the capsule tight */}
        {!expanded && lead && (
          <motion.span layout style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1,
            color: lead.color || accent, textTransform: 'uppercase',
          }}>
            {lead.value}
          </motion.span>
        )}

        {/* Expanded: title + the full strip blooms open */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={MORPH}
              style={{ display: 'flex', alignItems: 'center', gap: 14, overflow: 'hidden' }}
            >
              {title && (
                <span style={{
                  fontFamily: 'var(--display)', fontSize: '0.8rem', letterSpacing: 1,
                  color: 'var(--fg)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {title}
                </span>
              )}

              {title && hasStrip && (
                <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
              )}

              {fields.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, whiteSpace: 'nowrap' }}
                >
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 6.5, letterSpacing: 1.5,
                    textTransform: 'uppercase', color: 'rgba(224, 221, 174,0.35)',
                  }}>
                    {f.label}
                  </span>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 0.5,
                    color: f.color || 'var(--fg)',
                  }}>
                    {f.value}
                  </span>
                </motion.div>
              ))}

              {toggles.map((t, i) => (
                <motion.button
                  key={t.id}
                  onClick={t.onToggle}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * (fields.length + i), duration: 0.2 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                    background: 'transparent', border: 'none', padding: 2, whiteSpace: 'nowrap',
                    borderRadius: 6,
                    outline: kbActive && focusedId === t.id ? `1.5px solid ${accent}` : 'none',
                    outlineOffset: 2,
                  }}
                >
                  <span style={{
                    width: 15, height: 15, borderRadius: 5,
                    border: `1px solid ${t.active ? accent : 'rgba(255,255,255,0.18)'}`,
                    background: t.active ? accent : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s, border-color 0.2s', flexShrink: 0,
                  }}>
                    {t.active && <Check size={10} strokeWidth={3} color="#050a14" />}
                  </span>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1,
                    textTransform: 'uppercase', color: t.active ? 'var(--fg)' : 'rgba(224, 221, 174,0.5)',
                  }}>
                    {t.label}
                  </span>
                </motion.button>
              ))}

              {actions.map((a, i) => (
                <motion.button
                  key={a.id}
                  onClick={a.onClick}
                  whileTap={{ scale: 0.94 }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * (fields.length + toggles.length + i), duration: 0.2 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1.5,
                    textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
                    color: accent, background: `${accent}1a`, border: `1px solid ${accent}40`,
                    borderRadius: 9999, padding: '6px 12px',
                    outline: kbActive && focusedId === a.id ? `1.5px solid ${accent}` : 'none',
                    outlineOffset: 2,
                  }}
                >
                  {a.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function EcosystemTaskbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeProject } = useProject();
  const { activeDescriptor, zoneActive, zoneChain, transient, kbActive, clearPin } = usePill();
  const activeColor = activeProject?.accent_color || '#d7340b';
  // Per-project module toggles hide a dock icon entirely when its department
  // is switched off for the active project — 'home' has no toggle of its own.
  const modules = getProjectModules(activeProject?.settings);
  const visibleApps = APPS.filter(app => !('module' in app) || modules[(app as { module: keyof EcosystemModules }).module]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [kbFocusIndex, setKbFocusIndex] = useState(-1);

  // Flatten the active descriptor's toggles + actions into one orderable list
  // — this is the order the hotkeys and Tab-focus ring walk through.
  const hotkeyItems = React.useMemo(() => {
    const toggles = activeDescriptor?.toggles ?? [];
    const actions = activeDescriptor?.actions ?? [];
    return [
      ...toggles.map(t => ({ id: t.id, run: t.onToggle })),
      ...actions.map(a => ({ id: a.id, run: a.onClick })),
    ];
  }, [activeDescriptor]);

  useEffect(() => { if (!kbActive) setKbFocusIndex(-1); }, [kbActive]);
  useEffect(() => { setKbFocusIndex(-1); }, [hotkeyItems.length]);

  // Close switcher and drop any clicked-and-pinned zone on route change —
  // a pin from the previous page shouldn't keep steering hotkeys on the new one.
  useEffect(() => { setProjectsOpen(false); clearPin(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!projectsOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-taskbar]')) setProjectsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [projectsOpen]);

  // While Caps Lock is held: digits/QWERTY fire the matching toggle/action;
  // Tab/Shift+Tab walk a focus ring (Enter activates); arrows switch app
  // (left/right) or open/close the context capsule (up/down).
  useEffect(() => {
    if (!kbActive) return;
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      if (e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (visibleApps[idx]) router.push(visibleApps[idx].path);
        return;
      }

      if (e.key === 'ArrowUp') { e.preventDefault(); setContextExpanded(true); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setContextExpanded(false); return; }

      if (e.key === 'Tab' || e.key === ']' || e.key === 'ArrowRight') {
        if (!hotkeyItems.length) return;
        e.preventDefault();
        setKbFocusIndex(i => {
          const n = hotkeyItems.length;
          return e.shiftKey ? (i - 1 + n) % n : (i + 1) % n;
        });
        return;
      }
      
      if (e.key === '[' || e.key === 'ArrowLeft') {
        if (!hotkeyItems.length) return;
        e.preventDefault();
        setKbFocusIndex(i => {
          const n = hotkeyItems.length;
          return (i - 1 + n) % n;
        });
        return;
      }

      if (e.key === 'Enter' || e.key === 'Control') {
        if (kbFocusIndex >= 0 && hotkeyItems[kbFocusIndex]) {
          e.preventDefault();
          hotkeyItems[kbFocusIndex].run();
        }
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kbActive, hotkeyItems, kbFocusIndex, pathname]);

  if (pathname === '/login' || pathname === '/auth') return null;

  // Determine active module color for contextual glow
  const activeApp = APPS.find(a => a.path !== '/' ? pathname.startsWith(a.path) : pathname === '/');
  const moduleColor = activeDescriptor?.accent ?? activeApp?.color ?? '#d7340b';
  // The context capsule shows whenever a page publishes a descriptor (or a
  // transient activity is firing). It blooms open on hover, an in-page zone
  // hover, or when the keyboard-hotkey layer is armed.
  const showContext = !!activeDescriptor || !!transient;
  const contextOpen = contextExpanded || zoneActive || kbActive;
  const focusedId = kbFocusIndex >= 0 ? hotkeyItems[kbFocusIndex]?.id ?? null : null;

  return (
    <div
      data-taskbar
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {/* The row binds the dock and its context capsule into one hover region,
          so crossing the gap between them never collapses the context. */}
      <motion.div
        layout
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ layout: MORPH, default: { delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] } }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none' }}
      >
        {/* ── Main dock — main's proven, fully-clickable taskbar, unchanged ── */}
        <motion.div
          layout
          className="mc-taskbar"
          style={{
            background: 'rgba(8, 8, 8, 0.85)',
            backdropFilter: 'blur(28px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 24,
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            pointerEvents: 'auto',
            boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02) inset, 0 -1px 0 ${moduleColor}22 inset`,
            position: 'relative',
          }}
          onMouseLeave={() => setHoveredId(null)}
        >
          {/* Command palette trigger */}
          <div style={{ position: 'relative' }}>
            <motion.button
              onClick={() => window.dispatchEvent(new Event('mc-open-command-palette'))}
              aria-label="Search (Command-K)"
              onHoverStart={() => setHoveredId('search')}
              whileHover={{ scale: 1.18, y: -6 }}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              style={{
                width: 46, height: 46, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: hoveredId === 'search' ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', cursor: 'pointer',
                color: hoveredId === 'search' ? 'rgba(224, 221, 174,0.7)' : 'rgba(224, 221, 174,0.3)', transition: 'background 0.25s, color 0.25s',
              }}
            >
              <Search size={18} strokeWidth={1.5} />
            </motion.button>
            <AnimatePresence>
              {hoveredId === 'search' && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.92 }} animate={{ opacity: 1, y: -10, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.92 }} transition={{ duration: 0.18 }}
                  style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(5, 10, 18, 0.96)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(224, 221, 174,0.85)', fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1.5, textTransform: 'uppercase', padding: '5px 10px', borderRadius: 8, whiteSpace: 'nowrap', pointerEvents: 'none', backdropFilter: 'blur(10px)', display: 'flex', gap: 6, alignItems: 'center' }}
                >
                  Search <kbd style={{ fontSize: 7.5, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 3, padding: '1px 4px' }}>⌘K</kbd>
                  <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid rgba(255,255,255,0.1)' }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.07)', margin: '0 4px', flexShrink: 0 }} />

          {/* App icons */}
          {visibleApps.map((app) => {
            const isActive = pathname === app.path || (app.path !== '/' && pathname.startsWith(app.path));
            const isHovered = hoveredId === app.id;
            const Icon = app.icon;

            return (
              <Link key={app.id} href={app.path} aria-label={app.name} title={app.name} style={{ textDecoration: 'none', position: 'relative' }}>
                <motion.div
                  onHoverStart={() => setHoveredId(app.id)}
                  whileHover={{ scale: 1.18, y: -6 }}
                  whileTap={{ scale: 0.93 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isActive
                      ? `${app.color}18`
                      : isHovered
                      ? 'rgba(255,255,255,0.06)'
                      : 'transparent',
                    color: isActive ? app.color : isHovered ? 'rgba(224, 221, 174,0.7)' : 'rgba(224, 221, 174,0.3)',
                    position: 'relative',
                    transition: 'background 0.25s, color 0.25s',
                    boxShadow: isActive ? `0 0 18px ${app.color}22` : 'none',
                  }}
                >
                  <Icon size={19} strokeWidth={1.5} />

                  {/* Active indicator dot */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="taskbar-dot"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        style={{
                          position: 'absolute',
                          bottom: 3,
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: app.color,
                          boxShadow: `0 0 6px ${app.color}`,
                        }}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.92 }}
                      animate={{ opacity: 1, y: -10, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.92 }}
                      transition={{ duration: 0.18 }}
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(5, 10, 18, 0.96)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(224, 221, 174,0.85)',
                        fontFamily: 'var(--mono)',
                        fontSize: 8.5,
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        padding: '5px 10px',
                        borderRadius: 8,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      {app.name}
                      <div style={{
                        position: 'absolute',
                        top: '100%', left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0, height: 0,
                        borderLeft: '4px solid transparent',
                        borderRight: '4px solid transparent',
                        borderTop: '4px solid rgba(255,255,255,0.1)',
                      }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}

          {/* Divider */}
          <div style={{
            width: 1, height: 22, background: 'rgba(255,255,255,0.07)',
            margin: '0 4px', flexShrink: 0,
          }} />

          {/* Project switcher button */}
          <div style={{ position: 'relative' }}>
            <motion.button
              onClick={() => setProjectsOpen(v => !v)}
              aria-label="Switch project"
              onHoverStart={() => setHoveredId('projects')}
              onHoverEnd={() => setHoveredId(null)}
              whileHover={{ scale: 1.08, y: -3 }}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              style={{
                width: 46, height: 46, borderRadius: 16,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2,
                background: projectsOpen
                  ? `${activeColor}18`
                  : hoveredId === 'projects'
                  ? 'rgba(255,255,255,0.06)'
                  : 'transparent',
                border: 'none', cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.25s',
              }}
            >
              {/* Active project color swatch */}
              {activeProject && (
                <div style={{
                  position: 'absolute',
                  top: 8, right: 8,
                  width: 5, height: 5, borderRadius: '50%',
                  background: activeColor,
                  boxShadow: `0 0 6px ${activeColor}`,
                }} />
              )}
              <FolderOpen
                size={18}
                strokeWidth={1.5}
                color={projectsOpen
                  ? (activeColor)
                  : hoveredId === 'projects'
                  ? 'rgba(224, 221, 174,0.7)'
                  : 'rgba(224, 221, 174,0.3)'}
              />
              <motion.div
                animate={{ rotate: projectsOpen ? 0 : 180 }}
                transition={{ duration: 0.2 }}
                style={{ lineHeight: 0 }}
              >
                <ChevronUp
                  size={8}
                  color={projectsOpen ? (activeColor) : 'rgba(224, 221, 174,0.25)'}
                />
              </motion.div>
            </motion.button>

            {/* Switcher tooltip */}
            <AnimatePresence>
              {hoveredId === 'projects' && !projectsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.92 }}
                  animate={{ opacity: 1, y: -10, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.92 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(5, 10, 18, 0.96)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(224, 221, 174,0.85)',
                    fontFamily: 'var(--mono)',
                    fontSize: 8.5,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    padding: '5px 10px',
                    borderRadius: 8,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {activeProject ? activeProject.title : 'Projects'}
                  <div style={{
                    position: 'absolute',
                    top: '100%', left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: '4px solid rgba(255,255,255,0.1)',
                  }} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Project switcher panel */}
            <AnimatePresence>
              {projectsOpen && (
                <ProjectSwitcher onClose={() => setProjectsOpen(false)} />
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.07)', margin: '0 4px', flexShrink: 0 }} />

          {/* Notifications */}
          <NotificationBell />

          {/* Audio Engine */}
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 4 }}>
            <GlobalAudioWidget />
          </div>

          {/* Account: profile + settings */}
          {([
            { id: 'profile', name: 'Profile', icon: User, path: '/profile' },
            { id: 'settings', name: 'Settings', icon: Settings, path: '/settings' },
          ] as const).map(item => {
            const isActive = pathname.startsWith(item.path);
            const isHovered = hoveredId === item.id;
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.path} aria-label={item.name} title={item.name} style={{ textDecoration: 'none', position: 'relative' }}>
                <motion.div
                  onHoverStart={() => setHoveredId(item.id)}
                  whileHover={{ scale: 1.18, y: -6 }}
                  whileTap={{ scale: 0.93 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                  style={{
                    width: 46, height: 46, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isActive ? 'rgba(215, 52, 11,0.10)' : isHovered ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: isActive ? '#d7340b' : isHovered ? 'rgba(224, 221, 174,0.7)' : 'rgba(224, 221, 174,0.3)',
                    transition: 'background 0.25s, color 0.25s',
                  }}
                >
                  <Icon size={19} strokeWidth={1.5} />
                </motion.div>
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.92 }}
                      animate={{ opacity: 1, y: -10, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.92 }}
                      transition={{ duration: 0.18 }}
                      style={{
                        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(5, 10, 18, 0.96)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(224, 221, 174,0.85)',
                        fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1.5, textTransform: 'uppercase',
                        padding: '5px 10px', borderRadius: 8, whiteSpace: 'nowrap', pointerEvents: 'none', backdropFilter: 'blur(10px)',
                      }}
                    >
                      {item.name}
                      <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid rgba(255,255,255,0.1)' }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </motion.div>

        {/* ── Context capsule: the live module context, budded off the dock.
            Shows a transient activity ("Saved") or the page's live descriptor
            (fields/toggles/actions published via usePillStage / usePillZone). ── */}
        <AnimatePresence>
          {showContext && (
            <motion.div
              key="context"
              layout
              initial={{ opacity: 0, scale: 0.85, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: -10 }}
              transition={MORPH}
              onMouseEnter={() => setContextExpanded(true)}
              onMouseLeave={() => setContextExpanded(false)}
              style={{ pointerEvents: 'auto' }}
            >
              {transient ? (
                <div style={{
                  display: 'flex', alignItems: 'center', height: 52, padding: '0 16px',
                  borderRadius: 26,
                  background: 'rgba(8, 8, 8, 0.85)',
                  backdropFilter: 'blur(28px) saturate(1.6)',
                  WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
                  border: `1px solid ${moduleColor}40`,
                  boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 22px ${moduleColor}20`,
                }}>
                  <TransientView label={transient.label} tone={transient.tone} />
                </div>
              ) : activeDescriptor ? (
                <ContextCapsule
                  descriptor={activeDescriptor}
                  accent={moduleColor}
                  expanded={contextOpen}
                  zoneChain={zoneChain}
                  kbActive={kbActive}
                  focusedId={focusedId}
                />
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
