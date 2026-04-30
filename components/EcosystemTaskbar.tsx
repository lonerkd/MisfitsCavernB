'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, FileText, LayoutGrid, MessageSquare, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const APPS = [
  { id: 'home',      name: 'Hub',       icon: Home,          path: '/',          color: '#ff3c00' },
  { id: 'editor',    name: 'ScriptOS',  icon: FileText,      path: '/editor',    color: '#ff3c00' },
  { id: 'studio',    name: 'Studio',    icon: LayoutGrid,    path: '/studio',    color: '#6366f1' },
  { id: 'lounge',    name: 'Lounge',    icon: MessageSquare, path: '/lounge',    color: '#10b981' },
  { id: 'portfolio', name: 'Portfolio', icon: Briefcase,     path: '/portfolio', color: '#f59e0b' },
];

export default function EcosystemTaskbar() {
  const pathname = usePathname();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (pathname === '/login') return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: 'rgba(8, 8, 8, 0.82)',
          backdropFilter: 'blur(28px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: 24,
          padding: '8px 10px',
          display: 'flex',
          gap: 4,
          pointerEvents: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset',
        }}
        onMouseLeave={() => setHoveredId(null)}
      >
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

              {/* Tooltip — floats above on hover */}
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
                    {/* Arrow */}
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
      </motion.div>
    </div>
  );
}
