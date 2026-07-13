// ── The OS: the suite's core state backbone ──────────────────────
// Identity, active project, permissions, and sync are resolved here,
// once, and every tool subscribes. supabase.auth.getUser() is called
// in exactly two places in the app: lib/os/boot.ts and middleware.ts.

export * from './types';
export { useOSStore, osState } from './store';
export { bootOS, resetOS, refreshActiveProject, ACTIVE_PROJECT_KEY, SCRIPT_POINTER_PREFIX } from './boot';
export { fetchProjectDetails } from './queries';
export { syncActiveProject, syncProjectList, teardownSync, hydrateActiveProject } from './sync';
export { osUserId, osUser, requireUserId, awaitOSUser } from './identity';
export {
  osSignIn, osSignUp, osSignOut,
  osSetActiveProject, osRefreshProject, osUpdateProject,
  osLoadProjectAccess, osCanPerformAction, osCheckProjectAccess, osHasRole,
} from './actions';
export {
  useSession, useCurrentUser, useAuthState, useAuthActions,
  useOSGate, useProject, useProjectAccess,
  usePermission, usePageAccess, useActionAccess,
} from './hooks';
export { ActionButton, IfAccess, ProtectedPage } from './guards';
export { OSProvider } from './OSProvider';
export {
  getPermissionsForRole, hasPermission, hasAnyPermission, hasAllPermissions,
  getProjectPermissions, hasProjectPermission, determineUserRole,
} from './permissions';
export type { ProjectRole } from './permissions';
export { ACCESS_MATRIX, canAccessPage, canPerformAction, getAccessSummary } from './access-matrix';
export { mapStatusToPhase, getPhasesForType, phaseIndexForType } from './phases';
export type { Phase } from './phases';
export { osNotify, registerOSNotifier } from './notify';
