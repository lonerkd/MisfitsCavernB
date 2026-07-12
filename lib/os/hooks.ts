'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOSStore } from './store';
import { canAccessPage, canPerformAction as canPerformActionMatrix } from './access-matrix';
import {
  osSignIn, osSignUp, osSignOut, osSetActiveProject, osUpdateProject,
  osRefreshProject, osLoadProjectAccess, osCanPerformAction, osCheckProjectAccess,
} from './actions';
import type { Permission, AccessContext } from '@/lib/context/types';

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
    userRole: session.userRole,
    isGuest: !isAuthenticated,
    isAdmin: session.userRole === 'admin',
    isCreator: session.userRole === 'project_creator',
    isCrewMember: session.userRole === 'crew_member',
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
      router.replace('/auth');
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

export function useProjectAccess(projectId: string) {
  const projectAccess = useOSStore((s) => s.session.projectAccess);
  const access = projectAccess[projectId];
  const loaded = useRef<string | null>(null);

  useEffect(() => {
    if (projectId && loaded.current !== projectId) {
      loaded.current = projectId;
      osLoadProjectAccess(projectId);
    }
  }, [projectId]);

  return {
    isLoaded: !!access,
    role: access?.userRole || 'viewer',
    canEdit: access?.canEdit || false,
    canDelete: access?.canDelete || false,
    canManageCrew: access?.canManageCrew || false,
    canViewScripts: access?.canViewScripts || false,
    canEditScripts: access?.canEditScripts || false,
    canCreateScripts: access?.canCreateScripts || false,
    loadAccess: () => osLoadProjectAccess(projectId),
  };
}

// ── Permission hooks ─────────────────────────────────────────────
export function usePermission(permission: Permission, context?: AccessContext): boolean {
  useOSStore((s) => s.session);
  return osCanPerformAction(permission, context);
}

export function usePageAccess(path: string): boolean {
  const userRole = useOSStore((s) => s.session.userRole);
  return canAccessPage(userRole, path);
}

export function useActionAccess(action: string): boolean {
  const userRole = useOSStore((s) => s.session.userRole);
  return canPerformActionMatrix(userRole, action);
}

export { osCanPerformAction, osCheckProjectAccess };
