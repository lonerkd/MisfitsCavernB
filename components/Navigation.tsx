'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Menu } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Editor',    href: '/editor'    },
  { label: 'Studio',    href: '/studio'    },
  { label: 'Lounge',    href: '/lounge'    },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Jobs',      href: '/jobs'      },
];

export default function Navigation() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          padding: scrolled ? '12px 28px' : '18px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000,
          background: scrolled ? 'rgba(6,6,6,0.90)' : 'transparent',
          backdropFilter: scrolled ? 'blur(24px) saturate(1.4)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(1.4)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
          transition: 'padding 0.4s, background 0.4s, border-color 0.4s',
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            fontFamily: 'var(--display)',
            fontSize: '1rem',
            letterSpacing: 7,
            color: 'var(--fg)',
            textDecoration: 'none',
            opacity: 0.9,
            transition: 'opacity 0.3s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.5')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.9')}
        >
          MC
        </Link>

        {/* Desktop — pill nav group */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Pill container */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 9999,
            padding: '4px 6px',
          }}>
            {NAV_LINKS.map(link => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '7px 14px',
                    borderRadius: 9999,
                    fontFamily: 'var(--mono)',
                    fontSize: 8.5,
                    letterSpacing: 2.5,
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    color: active ? 'var(--fg)' : 'var(--fg-dim)',
                    background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                    transition: 'color 0.25s, background 0.25s',
                    zIndex: 1,
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.color = 'var(--fg-muted)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = active ? 'var(--fg)' : 'var(--fg-dim)';
                    e.currentTarget.style.background = active ? 'rgba(255,255,255,0.08)' : 'transparent';
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 9999,
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        zIndex: -1,
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                    />
                  )}
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Sign In — separate from pill group */}
          <Link
            href="/auth"
            style={{
              marginLeft: 10,
              fontFamily: 'var(--mono)',
              fontSize: 8.5,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              padding: '9px 18px',
              background: 'var(--accent)',
              color: '#060606',
              textDecoration: 'none',
              borderRadius: 9999,
              fontWeight: 600,
              transition: 'transform 0.25s, box-shadow 0.3s, opacity 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,60,0,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="show-mobile"
          style={{ background: 'none', border: 'none', color: 'var(--fg)', padding: 4, cursor: 'pointer' }}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </motion.nav>

      {/* Mobile slide-in menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: 0, right: 0,
              width: 280,
              height: '100dvh',
              background: 'rgba(8,8,8,0.97)',
              backdropFilter: 'blur(24px)',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
              zIndex: 999,
              padding: '72px 28px 36px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {NAV_LINKS.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.055, duration: 0.4 }}
              >
                <Link
                  href={link.href}
                  style={{
                    display: 'block',
                    fontFamily: 'var(--display)',
                    fontSize: '1.8rem',
                    letterSpacing: 3,
                    color: pathname.startsWith(link.href) ? 'var(--accent)' : 'var(--fg)',
                    textDecoration: 'none',
                    padding: '13px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.36 }}
              style={{ marginTop: 'auto' }}
            >
              <Link
                href="/auth"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '14px',
                  background: 'var(--accent)',
                  color: '#060606',
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  fontWeight: 600,
                  borderRadius: 9999,
                }}
              >
                Sign In
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 998, backdropFilter: 'blur(4px)' }}
          />
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        @media (min-width: 769px) {
          .hide-mobile { display: flex !important; }
          .show-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}
