'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, FileText, LayoutGrid, MessageSquare, Briefcase, ChevronUp, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProject } from '@/lib/context/ProjectContext';

const APPS = [
  { id: 'home',      name: 'Hub',       icon: Home,          path: '/',          color: '#ff3c00' },
  { id: 'editor',    name: 'ScriptOS',  icon: FileText,      path: '/editor',    color: '#ff3c00' },
  { id: 'studio',    name: 'Studio',    icon: LayoutGrid,    path: '/studio',    color: '#6366f1' },
  { id: 'lounge',    name: 'Lounge',    icon: MessageSquare, path: '/lounge',    color: '#10b981' },
  { id: 'portfolio', name: 'Portfolio', icon: Briefcase,     path: '/portfolio', color: '#f59e0b' },
];

interface RecentProject {
  id: string;
  title: string;
  color: string;
  phase: string;
}

const SAMPLE_PROJECTS: RecentProject[] = [
  { id: '1', title: 'Femme Fatale', color: '#ff3c00', phase: 'pre-production' },
  { id: '2', title: '10 Million',   color: '#f59e0b', phase: 'post-production' },
  { id: '3', title: 'The Briefcase',color: '#10b981', phase: 'delivery' },
];

function ProjectSwitcher({ onClose }: { onClose: () => void }) {
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
        background: 'rgba(10,10,10,0.96)',
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
        textTransform: 'uppercase', color: 'rgba(240,236,228,0.3)',
        padding: '4px 8px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        marginBottom: 6,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        Projects
        <Link href="/projects" onClick={onClose} style={{
          color: 'rgba(255,60,0,0.7)', textDecoration: 'none', fontSize: 7,
          letterSpacing: 1.5,
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ff3c00')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,60,0,0.7)')}
        >
          All →
        </Link>
      </div>

      {/* Project list */}
      {SAMPLE_PROJECTS.map((proj, i) => (
        <Link
          key={proj.id}
          href={`/projects/${proj.id}`}
          onClick={onClose}
          style={{ textDecoration: 'none', display: 'block' }}
        >
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 8px',
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            whileHover={{ background: 'rgba(255,255,255,0.05)' } as any}
          >
            {/* Color dot */}
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: proj.color,
              boxShadow: `0 0 8px ${proj.color}`,
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--display)', fontSize: '0.78rem',
                letterSpacing: 1, color: 'var(--fg)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {proj.title}
              </div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 7, letterSpacing: 1.5,
                color: 'rgba(240,236,228,0.3)', textTransform: 'uppercase',
              }}>
                {proj.phase}
              </div>
            </div>
          </motion.div>
        </Link>
      ))}
    </motion.div>
  );
}

export default function EcosystemTaskbar() {
  const pathname = usePathname();
  const { activeProject, projects, setActiveProject } = useProject();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showProjectMenu, setShowProjectMenu] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!showProjectMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-taskbar]')) setShowProjectMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProjectMenu]);

  if (pathname === '/login' || pathname === '/auth') return null;

  // Determine active module color for contextual glow
  const activeApp = APPS.find(a => a.path !== '/' ? pathname.startsWith(a.path) : pathname === '/');
  const moduleColor = activeApp?.color ?? '#ff3c00';

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
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
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
        {/* App icons */}
        {APPS.map((app) => {
          const isActive = pathname === app.path || (app.path !== '/' && pathname.startsWith(app.path));
          const isHovered = hoveredId === app.id;
          const Icon = app.icon;

          return (
            <Link key={app.id} href={app.path} style={{ textDecoration: 'none', position: 'relative' }}>
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
                  color: isActive ? app.color : isHovered ? 'rgba(240,236,228,0.7)' : 'rgba(240,236,228,0.3)',
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
                      background: 'rgba(14,14,14,0.96)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(240,236,228,0.85)',
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
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', alignSelf: 'center', margin: '0 4px' }} />
        
        {/* Project Selector */}
        <div style={{ position: 'relative' }}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            style={{
              height: 44,
              padding: '0 16px',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              color: activeProject ? '#fff' : '#666',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'var(--mono)',
              textTransform: 'uppercase',
              letterSpacing: 1
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: activeProject?.accent_color || 'var(--accent)' }} />
            {activeProject?.title || 'No Project'}
          </motion.div>

          <AnimatePresence>
            {showProjectMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: -10 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  marginBottom: 12,
                  width: 200,
                  background: 'rgba(10, 10, 10, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 16,
                  padding: 8,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  zIndex: 10000,
                  pointerEvents: 'auto'
                }}
              >
                <div style={{ fontSize: 8, color: '#666', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Switch Project</div>
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveProject(p);
                      setShowProjectMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: activeProject?.id === p.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                      color: activeProject?.id === p.id ? '#fff' : '#aaa',
                      textAlign: 'left',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = activeProject?.id === p.id ? 'rgba(255,255,255,0.05)' : 'transparent')}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.accent_color || 'var(--accent)' }} />
                    {p.title}
                  </button>
                ))}
                {projects.length === 0 && (
                  <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 10, color: '#444' }}>No projects found</div>
                )}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4, paddingTop: 4 }}>
                  <Link href="/projects" style={{ textDecoration: 'none' }}>
                    <button style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer', textAlign: 'center' }}>Manage All Projects</button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
