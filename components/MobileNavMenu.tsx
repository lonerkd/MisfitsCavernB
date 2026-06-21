'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Menu } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

const NAV_LINKS = [
  { label: 'Editor',    href: '/editor'    },
  { label: 'Studio',    href: '/studio'    },
  { label: 'Lounge',    href: '/lounge'    },
  { label: 'Crew',      href: '/crew'      },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Jobs',      href: '/jobs'      },
];

// Drop-in hamburger + slide-in menu for pages that hand-roll their own top
// nav bar (Studio/Lounge/Crew/Jobs/Portfolio) instead of using the shared
// <Navigation/> used on the homepage. Renders nothing on desktop widths.
export default function MobileNavMenu() {
  const pathname = usePathname();
  const { user, profile, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const displayName = profile?.username || user?.email?.split('@')[0] || 'Account';

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <div className="mobile-nav-show" style={{ display: 'none' }}>
        <button
          onClick={() => setOpen(!open)}
          aria-label="Open menu"
          style={{ background: 'none', border: 'none', color: 'var(--fg)', padding: 4, cursor: 'pointer', display: 'flex' }}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', top: 0, right: 0, width: 280, height: '100dvh',
              background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(24px)',
              borderLeft: '1px solid rgba(255,255,255,0.06)', zIndex: 999,
              padding: '72px 28px 36px', display: 'flex', flexDirection: 'column', gap: 4,
            }}
          >
            {NAV_LINKS.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <Link
                  href={link.href}
                  style={{
                    display: 'block', fontFamily: 'var(--display)', fontSize: '1.6rem',
                    letterSpacing: 3, color: pathname.startsWith(link.href) ? 'var(--accent)' : 'var(--fg)',
                    textDecoration: 'none', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!loading && user ? (
                <>
                  <Link
                    href="/profile"
                    style={{
                      display: 'block', textAlign: 'center', padding: '14px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                      color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10,
                      letterSpacing: 3, textTransform: 'uppercase', textDecoration: 'none',
                      fontWeight: 600, borderRadius: 9999,
                    }}
                  >
                    {displayName}
                  </Link>
                  <button
                    onClick={() => { signOut(); setOpen(false); }}
                    style={{
                      padding: '14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
                      color: 'var(--fg-dim)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 3,
                      textTransform: 'uppercase', fontWeight: 600, borderRadius: 9999, cursor: 'pointer',
                    }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  style={{
                    display: 'block', textAlign: 'center', padding: '14px', background: 'var(--accent)',
                    color: '#040710', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 3,
                    textTransform: 'uppercase', textDecoration: 'none', fontWeight: 600, borderRadius: 9999,
                  }}
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          .mobile-nav-hide { display: none !important; }
          .mobile-nav-show { display: flex !important; }
        }
      `}</style>
    </>
  );
}
