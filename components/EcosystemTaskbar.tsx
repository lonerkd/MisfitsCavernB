'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  motion, AnimatePresence, useMotionValue, useTransform, useSpring, type MotionValue,
} from 'framer-motion';
import { Home, FileText, LayoutGrid, MessageSquare, Briefcase, ChevronUp, FolderOpen, Check } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProject, type Project } from '@/lib/context/ProjectContext';
import { usePill, type PillDescriptor } from '@/lib/context/PillContext';

// ─────────────────────────────────────────────────────────────────────────
// The Pill — a single Dynamic-Island-style capsule that is the ecosystem's
// command surface. It does three things, morphing fluidly between them:
//   1. COMPACT   — the app dock, idle, dimmed until the cursor approaches.
//   2. CONTEXTUAL — grows in length to surface the active module's live
//                   controls (published via PillContext), revealing them
//                   progressively as the cursor engages (Arc-style).
//   3. TRANSIENT — briefly reshapes to announce a live activity ("Saved",
//                   "Advanced to Production"), then collapses back.
// Material is Liquid-Glass: layered translucency, a specular sheen, and a
// contextual under-glow tinted to the module you're in.
// ─────────────────────────────────────────────────────────────────────────

const APPS = [
  { id: 'home',      name: 'Hub',       icon: Home,          path: '/',          color: '#ff3c00' },
  { id: 'editor',    name: 'ScriptOS',  icon: FileText,      path: '/editor',    color: '#ff3c00' },
  { id: 'studio',    name: 'Studio',    icon: LayoutGrid,    path: '/studio',    color: '#6366f1' },
  { id: 'lounge',    name: 'Lounge',    icon: MessageSquare, path: '/lounge',    color: '#10b981' },
  { id: 'portfolio', name: 'Portfolio', icon: Briefcase,     path: '/portfolio', color: '#f59e0b' },
];

const SPRING = { type: 'spring', stiffness: 380, damping: 30 } as const;
const MORPH = { duration: 0.42, ease: [0.16, 1, 0.3, 1] } as const;

// ── Dock icon with macOS-style cursor magnification ───────────────────────
function DockIcon({
  app, isActive, mouseX,
}: {
  app: (typeof APPS)[number];
  isActive: boolean;
  mouseX: MotionValue<number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const Icon = app.icon;

  // Distance of the cursor from this icon's horizontal centre drives the
  // magnification — exactly the Apple dock feel, fully mouse-aware.
  const distance = useTransform(mouseX, (val: number) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: 44 };
    return val - b.x - b.width / 2;
  });
  const sizeSync = useTransform(distance, [-130, 0, 130], [42, 58, 42]);
  const liftSync = useTransform(distance, [-130, 0, 130], [0, -9, 0]);
  const size = useSpring(sizeSync, { mass: 0.1, stiffness: 200, damping: 16 });
  const lift = useSpring(liftSync, { mass: 0.1, stiffness: 200, damping: 16 });

  return (
    <Link href={app.path} style={{ textDecoration: 'none', position: 'relative' }}>
      <motion.div
        ref={ref}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileTap={{ scale: 0.9 }}
        style={{
          width: size,
          height: size,
          y: lift,
          borderRadius: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isActive ? `${app.color}1f` : hovered ? 'rgba(255,255,255,0.07)' : 'transparent',
          color: isActive ? app.color : hovered ? 'rgba(240,236,228,0.85)' : 'rgba(240,236,228,0.38)',
          boxShadow: isActive ? `0 0 20px ${app.color}33, inset 0 0 0 1px ${app.color}33` : 'none',
          position: 'relative',
          transition: 'background 0.25s, color 0.25s, box-shadow 0.25s',
        }}
      >
        <Icon size={19} strokeWidth={1.6} />
        {isActive && (
          <motion.div
            layoutId="pill-active-dot"
            style={{
              position: 'absolute', bottom: 4,
              width: 4, height: 4, borderRadius: '50%',
              background: app.color, boxShadow: `0 0 6px ${app.color}`,
            }}
          />
        )}
      </motion.div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.92 }}
            animate={{ opacity: 1, y: -12, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.92 }}
            transition={{ duration: 0.16 }}
            style={{
              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(14,14,14,0.96)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(240,236,228,0.85)', fontFamily: 'var(--mono)', fontSize: 8.5,
              letterSpacing: 1.5, textTransform: 'uppercase', padding: '5px 10px',
              borderRadius: 8, whiteSpace: 'nowrap', pointerEvents: 'none', backdropFilter: 'blur(10px)',
            }}
          >
            {app.name}
          </motion.div>
        )}
      </AnimatePresence>
    </Link>
  );
}

// ── Context Satellite: a detached companion bubble beside the dock ─────────
// Like the way a live Spotify activity buds off the Dynamic Island, the active
// context lives in its own capsule next to the main Pill — a glanceable circle
// (a pulsing module beacon + lead read-out) when idle, blooming into the full
// strip of fields, toggles and actions the moment you engage or hover a zone.
// The dock keeps everything it had; the context just relocates and adapts.
function ContextSatellite({
  descriptor, accent, expanded, zoneChain,
}: {
  descriptor: PillDescriptor;
  accent: string;
  expanded: boolean;
  zoneChain: { depth: number; title: string }[];
}) {
  const { title, fields = [], toggles = [], actions = [] } = descriptor;
  const lead = fields[0];
  const hasStrip = fields.length > 0 || toggles.length > 0 || actions.length > 0;
  const showBreadcrumb = expanded && zoneChain.length > 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      {/* Depth cues — the full hovered nesting path, shallow → deep, so you
          can see how far you've drilled in, not just the deepest result. */}
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
              color: 'rgba(240,236,228,0.35)', whiteSpace: 'nowrap', pointerEvents: 'none',
            }}
          >
            {zoneChain.map((z, i) => {
              const isLast = i === zoneChain.length - 1;
              return (
                <React.Fragment key={`${z.depth}-${z.title}`}>
                  <span style={{ color: isLast ? accent : 'rgba(240,236,228,0.35)' }}>
                    {z.title}
                  </span>
                  {!isLast && <span style={{ color: 'rgba(240,236,228,0.18)' }}>›</span>}
                </React.Fragment>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8, x: -10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: -10 }}
        transition={MORPH}
        style={{
          pointerEvents: 'auto',
          display: 'flex', alignItems: 'center', gap: expanded ? 12 : 8,
          height: 52, padding: expanded ? '0 16px 0 13px' : '0 13px',
          borderRadius: 26, position: 'relative', overflow: 'hidden', whiteSpace: 'nowrap',
          // Same Liquid-Glass material as the dock, tinted to the active accent.
          background: 'linear-gradient(180deg, rgba(22,22,22,0.82) 0%, rgba(8,8,8,0.9) 100%)',
          backdropFilter: 'blur(30px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.8)',
          border: `1px solid ${accent}40`,
          boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 24px ${accent}24, inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 ${accent}33`,
        }}
      >
        {/* Specular sheen — matches the dock's glass highlight */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 26, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 40%)',
        }} />

        {/* Live beacon — the "active" pulse, the heart of the satellite */}
      <motion.span
        layout
        animate={{ scale: [1, 1.35, 1], opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 8, height: 8, borderRadius: '50%', background: accent,
          boxShadow: `0 0 10px ${accent}`, flexShrink: 0, position: 'relative', zIndex: 1,
        }}
      />

      {/* Collapsed: a single glanceable read-out keeps the bubble tight */}
      {!expanded && lead && (
        <motion.span layout style={{
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, position: 'relative', zIndex: 1,
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
            style={{ display: 'flex', alignItems: 'center', gap: 14, overflow: 'hidden', position: 'relative', zIndex: 1 }}
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
                  textTransform: 'uppercase', color: 'rgba(240,236,228,0.35)',
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
                  background: 'transparent', border: 'none', padding: 0, whiteSpace: 'nowrap',
                }}
              >
                <span style={{
                  width: 15, height: 15, borderRadius: 5,
                  border: `1px solid ${t.active ? accent : 'rgba(255,255,255,0.18)'}`,
                  background: t.active ? accent : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s, border-color 0.2s', flexShrink: 0,
                }}>
                  {t.active && <Check size={10} strokeWidth={3} color="#0a0a0a" />}
                </span>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1,
                  textTransform: 'uppercase', color: t.active ? 'var(--fg)' : 'rgba(240,236,228,0.5)',
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
                  fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: 1.5,
                  textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
                  color: accent, background: `${accent}1a`, border: `1px solid ${accent}40`,
                  borderRadius: 9999, padding: '6px 12px',
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

// ── Transient activity (Dynamic Island live event) ───────────────────────
function TransientView({ label, tone }: { label: string; tone: 'default' | 'success' | 'accent' }) {
  const color = tone === 'success' ? '#10b981' : tone === 'accent' ? '#ff3c00' : 'rgba(240,236,228,0.8)';
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

function ProjectSwitcher({
  projects, activeProject, onSelect, onClose,
}: {
  projects: Project[];
  activeProject: Project | null;
  onSelect: (p: Project) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
        marginBottom: 12, background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 10, width: 220,
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)', zIndex: 10,
      }}
    >
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: 2.5, textTransform: 'uppercase',
        color: 'rgba(240,236,228,0.3)', padding: '4px 8px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        Projects
        <Link href="/projects" onClick={onClose} style={{ color: 'rgba(255,60,0,0.7)', textDecoration: 'none', fontSize: 7, letterSpacing: 1.5 }}>
          All →
        </Link>
      </div>
      {projects.length === 0 ? (
        <div style={{ padding: '14px 8px', fontSize: 10, color: 'rgba(240,236,228,0.35)', textAlign: 'center' }}>
          No projects yet.
        </div>
      ) : projects.map((proj, i) => {
        const color = proj.accent_color || '#ff3c00';
        const isActive = activeProject?.id === proj.id;
        return (
          <div key={proj.id} onClick={() => { onSelect(proj); onClose(); }} style={{ cursor: 'pointer' }}>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 10,
                background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
              }}
              whileHover={{ background: 'rgba(255,255,255,0.05)' } as any}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--display)', fontSize: '0.78rem', letterSpacing: 1, color: 'var(--fg)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {proj.title}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 7, letterSpacing: 1.5, color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase' }}>
                  {proj.status}
                </div>
              </div>
            </motion.div>
          </div>
        );
      })}
    </motion.div>
  );
}

export default function EcosystemTaskbar() {
  const pathname = usePathname();
  const { activeProject, setActiveProject, projects } = useProject();
  const { activeDescriptor, zoneActive, zoneChain, transient } = usePill();
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const mouseX = useMotionValue(Infinity);

  useEffect(() => { setProjectsOpen(false); }, [pathname]);

  useEffect(() => {
    if (!projectsOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-taskbar]')) setProjectsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [projectsOpen]);

  if (pathname === '/login' || pathname === '/auth') return null;

  const activeApp = APPS.find(a => (a.path !== '/' ? pathname.startsWith(a.path) : pathname === '/'));
  // A hovered zone may override the accent (e.g. a scene cue tints differently
  // from the page); otherwise we use the active module's color.
  const moduleColor = activeDescriptor?.accent ?? activeApp?.color ?? '#ff3c00';
  const showContext = !!activeDescriptor && !transient;
  // The Pill morphs open when the cursor engages it OR when an in-page zone is
  // hovered — so hovering the script itself reveals its tools, no aim required.
  const contextOpen = expanded || zoneActive;

  return (
    <div
      data-taskbar
      style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, pointerEvents: 'none',
      }}
    >
      {/* The row binds the dock and its companion satellite into one hover
          region — crossing the gap between them never collapses the context. */}
      <motion.div
        layout
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ layout: MORPH, default: { delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] } }}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => { mouseX.set(Infinity); setExpanded(false); }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}
      >
        {/* ── Main Pill: the dock + project switcher, unchanged ── */}
        <motion.div
          layout
          style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', gap: 2,
            padding: '8px 12px',
            borderRadius: 26,
            // Liquid-Glass material — translucency + saturation + a contextual
            // under-glow tinted to the active module.
            background: 'linear-gradient(180deg, rgba(22,22,22,0.78) 0%, rgba(8,8,8,0.88) 100%)',
            backdropFilter: 'blur(30px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(30px) saturate(1.8)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: `0 24px 70px rgba(0,0,0,0.65), 0 0 36px ${moduleColor}14, inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 ${moduleColor}26`,
            overflow: 'hidden',
          }}
        >
          {/* Specular sheen — the glass highlight along the top edge */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 26, pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 38%)',
          }} />

          <AnimatePresence mode="popLayout" initial={false}>
            {transient ? (
              <TransientView key={`t-${transient.id}`} label={transient.label} tone={transient.tone} />
            ) : (
              <motion.div
                key="dock"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}
              >
                {APPS.map((app) => {
                  const isActive = pathname === app.path || (app.path !== '/' && pathname.startsWith(app.path));
                  return <DockIcon key={app.id} app={app} isActive={isActive} mouseX={mouseX} />;
                })}

                {/* Divider + project switcher */}
                <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.07)', margin: '0 6px', flexShrink: 0 }} />
                <div style={{ position: 'relative' }}>
                  <motion.button
                    onClick={() => setProjectsOpen(v => !v)}
                    whileHover={{ scale: 1.08, y: -3 }}
                    whileTap={{ scale: 0.93 }}
                    transition={SPRING}
                    style={{
                      width: 46, height: 46, borderRadius: 15,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                      background: projectsOpen ? `${activeProject?.accent_color ?? '#ff3c00'}1f` : 'transparent',
                      border: 'none', cursor: 'pointer', position: 'relative',
                    }}
                  >
                    {activeProject && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8, width: 5, height: 5, borderRadius: '50%',
                        background: activeProject.accent_color || '#ff3c00',
                        boxShadow: `0 0 6px ${activeProject.accent_color || '#ff3c00'}`,
                      }} />
                    )}
                    <FolderOpen
                      size={18} strokeWidth={1.6}
                      color={projectsOpen ? (activeProject?.accent_color ?? '#ff3c00') : 'rgba(240,236,228,0.4)'}
                    />
                    <motion.div animate={{ rotate: projectsOpen ? 0 : 180 }} transition={{ duration: 0.2 }} style={{ lineHeight: 0 }}>
                      <ChevronUp size={8} color={projectsOpen ? (activeProject?.accent_color ?? '#ff3c00') : 'rgba(240,236,228,0.25)'} />
                    </motion.div>
                  </motion.button>

                  <AnimatePresence>
                    {projectsOpen && (
                      <ProjectSwitcher projects={projects} activeProject={activeProject} onSelect={setActiveProject} onClose={() => setProjectsOpen(false)} />
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Companion satellite: the live context, budded off the dock ── */}
        <AnimatePresence>
          {showContext && (
            <ContextSatellite
              key="satellite"
              descriptor={activeDescriptor!}
              accent={moduleColor}
              expanded={contextOpen}
              zoneChain={zoneChain}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
