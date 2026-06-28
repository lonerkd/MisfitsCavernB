'use client';

import { useAuth } from '@/lib/context/AuthContext';
import { Permission, AccessContext } from '@/lib/context/types';
import { canAccessPage, canPerformAction as canPerformActionMatrix } from './access-matrix';

/**
 * Hook to check if current user can perform an action
 * @param permission - The permission to check
 * @param context - Optional context for project-specific permissions
 */
export function usePermission(permission: Permission, context?: AccessContext): boolean {
  const { canPerformAction } = useAuth();
  return canPerformAction(permission, context);
}

/**
 * Hook to check multiple permissions (user must have ALL)
 */
export function usePermissions(
  permissions: Permission[],
  context?: AccessContext
): boolean {
  const { canPerformAction } = useAuth();
  return permissions.every(p => canPerformAction(p, context));
}

/**
 * Hook to check if user has ANY of the provided permissions
 */
export function useAnyPermission(
  permissions: Permission[],
  context?: AccessContext
): boolean {
  const { canPerformAction } = useAuth();
  return permissions.some(p => canPerformAction(p, context));
}

/**
 * Hook to get all permissions for current user
 */
export function useUserPermissions() {
  const { permissions, userRole } = useAuth();
  return { permissions, userRole };
}

/**
 * Hook to check page access
 */
export function usePageAccess(path: string): boolean {
  const { userRole } = useAuth();
  return canAccessPage(userRole, path);
}

/**
 * Hook to check action access (action matrix)
 */
export function useActionAccess(action: string): boolean {
  const { userRole } = useAuth();
  return canPerformActionMatrix(userRole, action);
}

/**
 * Hook to get project-specific access
 */
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

/**
 * Hook to get current user info
 */
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

/**
 * Hook to handle authentication state
 */
export function useAuthState() {
  const { isAuthenticated, isLoading, error } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    error,
  };
}

/**
 * Hook to get auth methods
 */
export function useAuthActions() {
  const { signIn, signUp, signOut } = useAuth();

  return {
    signIn,
    signUp,
    signOut,
  };
}
