'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, FileText, LayoutGrid, MessageSquare, Briefcase, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function EcosystemTaskbar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  const apps = [
    { id: 'home', name: 'Hub', icon: Home, path: '/' },
    { id: 'editor', name: 'ScriptOS', icon: FileText, path: '/editor' },
    { id: 'studio', name: 'Studio', icon: LayoutGrid, path: '/studio' },
    { id: 'lounge', name: 'Lounge', icon: MessageSquare, path: '/lounge' },
    { id: 'portfolio', name: 'Portfolio', icon: Briefcase, path: '/portfolio' },
  ];

  if (pathname === '/login') return null;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: 24, 
        left: '50%', 
        transform: 'translateX(-50%)', 
        zIndex: 9999,
        pointerEvents: 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          background: 'rgba(10, 10, 10, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 24,
          padding: '8px',
          display: 'flex',
          gap: 6,
          pointerEvents: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        {apps.map((app) => {
          const isActive = pathname === app.path || (app.path !== '/' && pathname.startsWith(app.path));
          const Icon = app.icon;

          return (
            <Link key={app.id} href={app.path} style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ scale: 1.1, y: -4 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? 'rgba(255, 60, 0, 0.15)' : 'transparent',
                  color: isActive ? 'var(--accent)' : '#888',
                  position: 'relative',
                  transition: 'all 0.3s',
                }}
              >
                <Icon size={20} />
                
                {isActive && (
                  <motion.div 
                    layoutId="active-dot"
                    style={{ 
                      position: 'absolute', 
                      bottom: 4, 
                      width: 3, 
                      height: 3, 
                      borderRadius: '50%', 
                      background: 'var(--accent)' 
                    }} 
                  />
                )}

                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: -30 }}
                      exit={{ opacity: 0, y: 10 }}
                      style={{
                        position: 'absolute',
                        background: '#000',
                        color: '#fff',
                        fontSize: 9,
                        fontFamily: 'var(--mono)',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        padding: '4px 10px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        border: '1px solid rgba(255,255,255,0.1)',
                        pointerEvents: 'none'
                      }}
                    >
                      {app.name}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
        
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', alignSelf: 'center', margin: '0 4px' }} />
        
        {/* Extra Power Button / System Info */}
        <motion.div
          whileHover={{ rotate: 15 }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#555',
            cursor: 'pointer'
          }}
        >
          <Zap size={18} />
        </motion.div>
      </motion.div>
    </div>
  );
}
