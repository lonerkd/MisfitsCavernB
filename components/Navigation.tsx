'use client';

import Link from 'next/link';

export default function Navigation() {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        padding: '18px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        mixBlendMode: 'difference',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--display)',
          fontSize: '1.15rem',
          letterSpacing: 6,
          color: 'var(--fg)',
        }}
      >
        MISFITS CAVERN
      </div>

      <div style={{ display: 'flex', gap: 22 }}>
        {[
          { label: 'editor', href: '/editor' },
          { label: 'portfolio', href: '/portfolio' },
          { label: 'studio', href: '/studio' },
          { label: 'projects', href: '/projects' },
          { label: 'lounge', href: '/lounge' },
          { label: 'showcase', href: '/showcase' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              color: 'var(--fg)',
              textDecoration: 'none',
              fontSize: 9,
              letterSpacing: 4,
              textTransform: 'uppercase',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg)')}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
