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

export default function EcosystemTaskbar() {
  const pathname = usePathname();
  const { activeProject, projects, setActiveProject } = useProject();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showProjectMenu, setShowProjectMenu] = useState(false);

  // Close switcher on route change
  useEffect(() => { setShowProjectMenu(false); }, [pathname]);

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
  const activeColor = activeProject?.accent_color ?? '#ff3c00';

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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setHoveredId('projects')}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            style={{
              width: 46, height: 46, borderRadius: 16,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 2,
              background: showProjectMenu
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
              color={showProjectMenu
                ? activeColor
                : hoveredId === 'projects'
                ? 'rgba(240,236,228,0.7)'
                : 'rgba(240,236,228,0.3)'}
            />
            <motion.div
              animate={{ rotate: showProjectMenu ? 0 : 180 }}
              transition={{ duration: 0.2 }}
              style={{ lineHeight: 0 }}
            >
              <ChevronUp
                size={8}
                color={showProjectMenu ? activeColor : 'rgba(240,236,228,0.25)'}
              />
            </motion.div>
          </motion.button>

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
