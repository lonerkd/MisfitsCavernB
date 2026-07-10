'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { AuthState, UserProfile, ProjectAccess, AccessContext, Permission, UserRole } from '@/lib/context/types';
import { getPermissionsForRole, determineUserRole, hasPermission } from '@/lib/permissions/role-permissions';
import { logAuditAction } from '@/lib/supabase/audit';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  canPerformAction: (action: Permission, context?: AccessContext) => boolean;
  checkProjectAccess: (projectId: string, permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  loadProjectAccess: (projectId: string) => Promise<void>;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    userRole: 'guest',
    isLoading: true,
    error: null,
    permissions: [],
    projectAccess: {},
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (profile) {
            const userRole = determineUserRole(profile);
            const permissions = getPermissionsForRole(userRole);

            setState(prev => ({
              ...prev,
              isAuthenticated: true,
              user: profile as unknown as UserProfile,
              userRole,
              permissions,
              error: null,
            }));
          } else {
            // Authenticated but no profile row (missing/blocked by RLS): fall
            // back to guest permissions rather than leaving stale state — and
            // still clear isLoading below so the UI never hangs.
            setState(prev => ({
              ...prev,
              isAuthenticated: false,
              userRole: 'guest',
              permissions: getPermissionsForRole('guest'),
            }));
          }
        } else {
          setState(prev => ({
            ...prev,
            isAuthenticated: false,
            userRole: 'guest',
            permissions: getPermissionsForRole('guest'),
          }));
        }
      } catch (error) {
        console.error('Auth init error:', error);
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          error: 'Failed to initialize authentication',
        }));
      } finally {
        // Clear BOTH loading flags. state.isLoading gates ProtectedPage and
        // useAuthState across the suite; if we only cleared isLoadingAuth
        // (as before), every guarded page hung on "LOADING…" forever because
        // initAuth never reset state.isLoading from its initial `true`.
        setState(prev => ({ ...prev, isLoading: false }));
        setIsLoadingAuth(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only a real new sign-in fires 'SIGNED_IN' — a page refresh with an
      // existing session fires 'INITIAL_SESSION' instead, so this can't
      // double-log every reload the way logging on `session?.user` truthy
      // would have.
      if (event === 'SIGNED_IN' && session?.user) {
        logAuditAction(session.user.id, 'user_login', 'auth', session.user.id);
      }
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            const userRole = determineUserRole(profile);
            setState(prev => ({
              ...prev,
              isAuthenticated: true,
              user: profile as unknown as UserProfile,
              userRole,
              permissions: getPermissionsForRole(userRole),
              isLoading: false,
            }));
          } else {
            setState(prev => ({
              ...prev,
              isAuthenticated: false,
              userRole: 'guest',
              permissions: getPermissionsForRole('guest'),
              isLoading: false,
            }));
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          // Never leave the UI hung on a profile-fetch failure.
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          user: null,
          userRole: 'guest',
          permissions: getPermissionsForRole('guest'),
          projectAccess: {},
          isLoading: false,
        }));
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Sign in failed',
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          username,
          status: 'OPEN',
        });
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Sign up failed',
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const signOut = useCallback(async () => {
    const loggedOutUserId = state.user?.id;
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await supabase.auth.signOut();
      if (loggedOutUserId) logAuditAction(loggedOutUserId, 'user_logout', 'auth', loggedOutUserId);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Sign out failed',
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.user?.id]);

  const loadProjectAccess = useCallback(async (projectId: string) => {
    if (!state.user) return;

    try {
      // projects has no is_public column — selecting it errored the query, so
      // projectAccess was silently never populated for any project.
      const { data: project } = await supabase
        .from('projects')
        .select('id, creator_id')
        .eq('id', projectId)
        .single();

      if (!project) return;

      let projectRole: 'owner' | 'lead' | 'contributor' | 'viewer' = 'viewer';

      if (project.creator_id === state.user.id) {
        projectRole = 'owner';
      } else {
        const { data: crewMember } = await supabase
          .from('project_crew')
          .select('role, status')
          .eq('project_id', projectId)
          .eq('user_id', state.user.id)
          .single();

        if (crewMember && crewMember.status === 'confirmed') {
          projectRole = crewMember.role === 'lead' ? 'lead' : 'contributor';
        }
      }

      const projectPermissions = getProjectPermissionsForRole(projectRole);

      setState(prev => ({
        ...prev,
        projectAccess: {
          ...prev.projectAccess,
          [projectId]: {
            projectId,
            userRole: projectRole,
            permissions: projectPermissions,
            canEdit: projectRole === 'owner' || projectRole === 'lead',
            canDelete: projectRole === 'owner',
            canManageCrew: projectRole === 'owner' || projectRole === 'lead',
            canViewScripts: true,
            canEditScripts: projectRole !== 'viewer',
            canCreateScripts: projectRole !== 'viewer',
          },
        },
      }));
    } catch (error) {
      console.error('Error loading project access:', error);
    }
  }, [state.user]);

  const canPerformAction = useCallback(
    (action: Permission, context?: AccessContext): boolean => {
      // Check global permissions
      if (!hasPermission(state.userRole, action)) {
        return false;
      }

      // Check project-level permissions if context provided
      if (context?.projectId) {
        const projectAccess = state.projectAccess[context.projectId];
        if (projectAccess) {
          return projectAccess.permissions.includes(action);
        }
      }

      return true;
    },
    [state.userRole, state.projectAccess]
  );

  const checkProjectAccess = useCallback(
    (projectId: string, permission: Permission): boolean => {
      const projectAccess = state.projectAccess[projectId];
      if (!projectAccess) return false;
      return projectAccess.permissions.includes(permission);
    },
    [state.projectAccess]
  );

  const hasRole = useCallback(
    (role: UserRole): boolean => {
      return state.userRole === role;
    },
    [state.userRole]
  );

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    canPerformAction,
    checkProjectAccess,
    hasRole,
    loadProjectAccess,
    isLoadingAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Helper function to get project permissions
function getProjectPermissionsForRole(
  role: 'owner' | 'lead' | 'contributor' | 'viewer'
): Permission[] {
  const permissions: Record<typeof role, Permission[]> = {
    owner: [
      'view_site',
      'edit_project',
      'delete_project',
      'manage_crew',
      'create_script',
      'edit_script',
      'delete_script',
      'create_job',
      'edit_job',
      'delete_job',
      'view_analytics',
    ],
    lead: [
      'view_site',
      'edit_project',
      'manage_crew',
      'create_script',
      'edit_script',
      'delete_script',
      'create_job',
      'edit_job',
      'delete_job',
    ],
    contributor: [
      'view_site',
      'create_script',
      'edit_script',
      'create_job',
    ],
    viewer: [
      'view_site',
    ],
  };
  return permissions[role] || [];
}
