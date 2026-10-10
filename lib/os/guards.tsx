'use client';

// A page's gate in the UI. What anyone may read or change is decided by RLS
// in the database (bible/11-rules.md); this only decides what to show: the
// admin pages to admins, signed-in pages to people who are signed in. The
// UI's per-project check is useCanShape (lib/brief), which mirrors RLS.

import React from 'react';
import { useOSStore } from './store';

export type PageRequirement = 'signed-in' | 'admin';

interface ProtectedPageProps {
  require: PageRequirement;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedPage({ require, children, fallback }: ProtectedPageProps) {
  const session = useOSStore((s) => s.session);

  if (session.status === 'resolving') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.5 }}>LOADING...</div>
      </div>
    );
  }

  const signedIn = session.status === 'authed';
  const allowed = require === 'admin' ? signedIn && session.isAdmin : signedIn;
  if (!allowed) {
    return (
      fallback || (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', fontFamily: 'var(--mono)', color: 'var(--fg)',
        }}>
          <h1 style={{ fontSize: '2rem', letterSpacing: 2, marginBottom: 16 }}>ACCESS DENIED</h1>
          <p style={{ fontSize: 11, opacity: 0.6 }}>
            {require === 'admin' ? 'This page is for admins.' : 'Sign in to see this page.'}
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
