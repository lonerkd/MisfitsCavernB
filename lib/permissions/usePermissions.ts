'use client';

import { useAuth } from '@/lib/context/AuthContext';
import { Permission, AccessContext } from '@/lib/context/types';
import { canAccessPage, canPerformAction as canPerformActionMatrix } from './access-matrix';

export function usePermission(permission: Permission, context?: AccessContext): boolean {
  const { canPerformAction } = useAuth();
  return canPerformAction(permission, context);
}

export function usePermissions(
  permissions: Permission[],
  context?: AccessContext
): boolean {
  const { canPerformAction } = useAuth();
  return permissions.every(p => canPerformAction(p, context));
}

export function useAnyPermission(
  permissions: Permission[],
  context?: AccessContext
): boolean {
  const { canPerformAction } = useAuth();
  return permissions.some(p => canPerformAction(p, context));
}

export function useUserPermissions() {
  const { permissions, userRole } = useAuth();
  return { permissions, userRole };
}

export function usePageAccess(path: string): boolean {
  const { userRole } = useAuth();
  return canAccessPage(userRole, path);
}

export function useActionAccess(action: string): boolean {
  const { userRole } = useAuth();
  return canPerformActionMatrix(userRole, action);
}

export function useProjectAccess(projectId: string) {
  const { projectAccess, loadProjectAccess } = useAuth();

  const access = projectAccess[projectId];

  return {
    isLoaded: !!access,
    role: access?.userRole || 'viewer',
    canEdit: access?.canEdit || false,
    canDelete: access?.canDelete || false,
    canManageCrew: access?.canManageCrew || false,
    canViewScripts: access?.canViewScripts || false,
    canEditScripts: access?.canEditScripts || false,
    canCreateScripts: access?.canCreateScripts || false,
    loadAccess: () => loadProjectAccess(projectId),
  };
}

export function useCurrentUser() {
  const { user, isAuthenticated, userRole } = useAuth();

  return {
    isAuthenticated,
    user,
    userRole,
    isGuest: !isAuthenticated,
    isAdmin: userRole === 'admin',
    isCreator: userRole === 'project_creator',
    isCrewMember: userRole === 'crew_member',
  };
}

export function useAuthState() {
  const { isAuthenticated, isLoading, error } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    error,
  };
}

export function useAuthActions() {
  const { signIn, signUp, signOut } = useAuth();

  return {
    signIn,
    signUp,
    signOut,
  };
}
