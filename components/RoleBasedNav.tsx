'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useCurrentUser } from '@/lib/permissions/usePermissions';
import { LogOut, Settings, BarChart3, Users } from 'lucide-react';

/**
 * Role-based navigation that shows different menu items
 * based on user's role and permissions
 */
export function RoleBasedNav() {
  const { signOut } = useAuth();
  const router = useRouter();
  const { isAuthenticated, isAdmin, isCreator, isGuest, user } = useCurrentUser();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (isGuest) {
    return (
      <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link href="/auth" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          Sign In
        </Link>
      </nav>
    );
  }

  return (
    <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {/* Common items for all authenticated users */}
      <Link href="/profile" style={{ textDecoration: 'none', color: 'var(--fg)' }}>
        Profile
      </Link>
      <Link href="/projects" style={{ textDecoration: 'none', color: 'var(--fg)' }}>
        Projects
      </Link>
      <Link href="/editor" style={{ textDecoration: 'none', color: 'var(--fg)' }}>
        Editor
      </Link>

      {/* Creator+ features */}
      {(isCreator || isAdmin) && (
        <>
          <Link href="/jobs" style={{ textDecoration: 'none', color: 'var(--fg)' }}>
            Jobs
          </Link>
          <Link href="/portfolio" style={{ textDecoration: 'none', color: 'var(--fg)' }}>
            Portfolio
          </Link>
          <Link href="/studio" style={{ textDecoration: 'none', color: 'var(--fg)' }}>
            Studio
          </Link>
        </>
      )}

      {/* Admin items */}
      {isAdmin && (
        <>
          <div style={{ borderLeft: '1px solid var(--fg-muted)', height: 20, opacity: 0.3 }} />
          <Link
            href="/admin"
            style={{ textDecoration: 'none', color: 'var(--accent)', display: 'flex', gap: 4, alignItems: 'center' }}
          >
            <BarChart3 size={14} /> Admin
          </Link>
          <Link
            href="/admin/users"
            style={{ textDecoration: 'none', color: 'var(--accent)', display: 'flex', gap: 4, alignItems: 'center' }}
          >
            <Users size={14} /> Users
          </Link>
        </>
      )}

      {/* User menu */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 11, opacity: 0.6, fontFamily: 'var(--mono)' }}>
          {user?.username}
        </span>
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex',
            gap: 4,
            alignItems: 'center',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'var(--fg-muted)',
            padding: '6px 12px',
            fontSize: 10,
            fontFamily: 'var(--mono)',
            cursor: 'pointer',
            borderRadius: 4,
          }}
        >
          <LogOut size={12} /> Sign Out
        </button>
      </div>
    </nav>
  );
}

/**
 * Quick user status indicator
 */
export function UserStatusBadge() {
  const { user } = useCurrentUser();
  const { userRole } = useAuth();

  if (!user) return null;

  const roleColors: Record<string, string> = {
    admin: '#ff3c00',
    project_creator: '#0099ff',
    crew_member: '#00cc66',
    guest: '#999999',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      background: `${roleColors[userRole]}20`,
      border: `1px solid ${roleColors[userRole]}`,
      borderRadius: 4,
      fontSize: 10,
      fontFamily: 'var(--mono)',
      color: roleColors[userRole],
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleColors[userRole] }} />
      {userRole.toUpperCase().replace('_', ' ')}
    </div>
  );
}

/**
 * Role-aware breadcrumb navigation
 */
export function RoleBreadcrumb({ pages }: { pages: Array<{ label: string; href?: string }> }) {
  const { canPerformAction } = useAuth();

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, opacity: 0.6 }}>
      {pages.map((page, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span>/</span>}
          {page.href ? (
            <Link href={page.href} style={{ color: 'var(--fg)', textDecoration: 'none' }}>
              {page.label}
            </Link>
          ) : (
            <span>{page.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
