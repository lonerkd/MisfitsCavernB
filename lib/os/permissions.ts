import type { UserRole, Permission } from '@/lib/context/types';

// ── Global role permissions ──────────────────────────────────────
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_site', 'create_project', 'edit_project', 'delete_project', 'manage_crew',
    'create_script', 'edit_script', 'delete_script',
    'create_job', 'edit_job', 'delete_job',
    'manage_portfolio', 'access_studio', 'manage_users', 'view_analytics',
  ],
  project_creator: [
    'view_site', 'create_project', 'edit_project', 'delete_project', 'manage_crew',
    'create_script', 'edit_script', 'delete_script',
    'create_job', 'edit_job', 'delete_job',
    'manage_portfolio', 'access_studio', 'view_analytics',
  ],
  crew_member: [
    'view_site', 'create_script', 'edit_script', 'manage_portfolio', 'access_studio',
  ],
  guest: ['view_site'],
};

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return permissions.some((p) => rolePermissions.includes(p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return permissions.every((p) => rolePermissions.includes(p));
}

// ── Project role permissions ─────────────────────────────────────
export type ProjectRole = 'owner' | 'lead' | 'contributor' | 'viewer';

const PROJECT_ROLE_PERMISSIONS: Record<ProjectRole, Permission[]> = {
  owner: [
    'view_site', 'edit_project', 'delete_project', 'manage_crew',
    'create_script', 'edit_script', 'delete_script',
    'create_job', 'edit_job', 'delete_job', 'view_analytics',
  ],
  lead: [
    'view_site', 'edit_project', 'manage_crew',
    'create_script', 'edit_script', 'delete_script',
    'create_job', 'edit_job', 'delete_job',
  ],
  contributor: ['view_site', 'create_script', 'edit_script', 'create_job'],
  viewer: ['view_site'],
};

export function getProjectPermissions(projectRole: ProjectRole): Permission[] {
  return PROJECT_ROLE_PERMISSIONS[projectRole] || [];
}

export function hasProjectPermission(projectRole: ProjectRole, permission: Permission): boolean {
  return getProjectPermissions(projectRole).includes(permission);
}

// ── Role determination ───────────────────────────────────────────
export function determineUserRole(profile: any): UserRole {
  if (profile?.is_admin) return 'admin';
  return 'project_creator';
}
