'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Editor', href: '/editor' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Studio', href: '/studio' },
  { label: 'Projects', href: '/projects' },
  { label: 'Lounge', href: '/lounge' },
  { label: 'Showcase', href: '/showcase' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          padding: scrolled ? '14px 32px' : '20px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000,
          background: scrolled ? 'rgba(8,8,8,0.88)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
          transition: 'padding 0.4s, background 0.4s, border-color 0.4s, backdrop-filter 0.4s',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontFamily: 'var(--display)',
            fontSize: '1.1rem',
            letterSpacing: 6,
            color: 'var(--fg)',
            textDecoration: 'none',
            transition: 'opacity 0.3s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.6')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          MISFITS CAVERN
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}
          className="hide-mobile">
          {NAV_LINKS.map(link => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: active ? 'var(--accent)' : 'var(--fg)',
                  textDecoration: 'none',
                  fontSize: 9,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--mono)',
                  transition: 'color 0.3s',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--fg-muted)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = active ? 'var(--accent)' : 'var(--fg)'; }}
              >
                {link.label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      left: 0,
                      right: 0,
                      height: 1,
                      background: 'var(--accent)',
                    }}
                  />
                )}
              </Link>
            );
          })}

          <Link
            href="/auth"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: 3,
              textTransform: 'uppercase',
              padding: '9px 18px',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--fg)',
              textDecoration: 'none',
              borderRadius: 'var(--radius-full)',
              transition: 'border-color 0.3s, background 0.3s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'rgba(255,60,0,0.06)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="show-mobile"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--fg)',
            padding: 4,
          }}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 280,
              height: '100vh',
              background: '#0a0a0a',
              borderLeft: '1px solid rgba(255,255,255,0.04)',
              zIndex: 999,
              padding: '80px 32px 40px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {NAV_LINKS.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                <Link
                  href={link.href}
                  style={{
                    display: 'block',
                    fontFamily: 'var(--display)',
                    fontSize: '1.6rem',
                    letterSpacing: 3,
                    color: pathname === link.href ? 'var(--accent)' : 'var(--fg)',
                    textDecoration: 'none',
                    padding: '12px 0',
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
              transition={{ delay: 0.4 }}
              style={{ marginTop: 'auto' }}
            >
              <Link
                href="/auth"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '13px',
                  background: 'var(--accent)',
                  color: 'var(--bg)',
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Sign In
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 998,
            }}
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
