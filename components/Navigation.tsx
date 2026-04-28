'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Search, User, Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { label: 'editor', href: '/editor' },
  { label: 'projects', href: '/projects' },
  { label: 'jobs', href: '/jobs' },
  { label: 'crew', href: '/crew' },
  { label: 'studio', href: '/studio' },
  { label: 'lounge', href: '/lounge' },
  { label: 'portfolio', href: '/portfolio' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    supabase.auth.onAuthStateChange((_, session) => setUser(session?.user || null));

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 200,
        background: scrolled ? 'rgba(8,8,8,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : 'none',
        transition: 'all 0.3s'
      }}
    >
      <Link href="/" style={{ fontFamily: 'var(--display)', fontSize: '1.1rem', letterSpacing: 6, color: 'var(--fg)', textDecoration: 'none' }}>
        MISFITS
      </Link>

      {/* Desktop Nav */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              color: pathname === link.href ? 'var(--accent)' : 'var(--fg)',
              textDecoration: 'none',
              fontSize: 9,
              letterSpacing: 3,
              textTransform: 'uppercase',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = pathname === link.href ? 'var(--accent)' : 'var(--fg)')}
          >
            {link.label}
          </Link>
        ))}

        <Link href={user ? '/profile' : '/auth'}
          style={{ color: 'var(--fg)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 9, letterSpacing: 3, textTransform: 'uppercase' }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)'}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'var(--fg)'}>
          <User size={12} /> {user ? 'profile' : 'sign in'}
        </Link>
      </div>
    </nav>
  );
}
