'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOSStore } from './store';
import {
  osSignIn, osSignUp, osSignOut, osSetActiveProject, osUpdateProject,
  osRefreshProject,
} from './actions';

// ── Session ──────────────────────────────────────────────────────
export function useSession() {
  const session = useOSStore((s) => s.session);
  return {
    ...session,
    isAuthenticated: session.status === 'authed',
    isLoading: session.status === 'resolving',
  };
}

export function useCurrentUser() {
  const session = useOSStore((s) => s.session);
  const isAuthenticated = session.status === 'authed';
  return {
    isAuthenticated,
    user: session.user,
    isGuest: !isAuthenticated,
    isAdmin: isAuthenticated && session.isAdmin,
  };
}

export function useAuthState() {
  const session = useOSStore((s) => s.session);
  return {
    isAuthenticated: session.status === 'authed',
    isLoading: session.status === 'resolving',
    error: session.error,
  };
}

export function useAuthActions() {
  return { signIn: osSignIn, signUp: osSignUp, signOut: osSignOut };
}

// ── Gate: redirect anon visitors to /auth ────────────────────────
export function useOSGate(): { isLoading: boolean; user: { id: string } | null } {
  const router = useRouter();
  const session = useOSStore((s) => s.session);
  const redirected = useRef(false);

  useEffect(() => {
    if (session.status === 'anon' && !redirected.current) {
      redirected.current = true;
      // Match middleware: come back here after signing in.
      const back = window.location.pathname + window.location.search;
      router.replace(`/auth?redirect=${encodeURIComponent(back)}`);
    }
  }, [session.status, router]);

  return {
    isLoading: session.status === 'resolving',
    user: session.userId ? { id: session.userId } : null,
  };
}

// ── Project ──────────────────────────────────────────────────────
export function useProject() {
  const project = useOSStore((s) => s.project);
  return {
    activeProject: project.active,
    projects: project.list,
    loading: project.status !== 'ready',
    setActiveProject: osSetActiveProject,
    updateProject: osUpdateProject,
    refreshProject: osRefreshProject,
  };
}
