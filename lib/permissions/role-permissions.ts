// Role-based permission definitions

import { UserRole, Permission } from '@/lib/context/types';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_site',
    'create_project',
    'edit_project',
    'delete_project',
    'manage_crew',
    'create_script',
    'edit_script',
    'delete_script',
    'create_job',
    'edit_job',
    'delete_job',
    'manage_portfolio',
    'access_studio',
    'manage_users',
    'view_analytics',
  ],
  project_creator: [
    'view_site',
    'create_project',
    'edit_project',
    'delete_project',
    'manage_crew',
    'create_script',
    'edit_script',
    'delete_script',
    'create_job',
    'edit_job',
    'delete_job',
    'manage_portfolio',
    'access_studio',
    'view_analytics',
  ],
  crew_member: [
    'view_site',
    'create_script',
    'edit_script',
    'manage_portfolio',
    'access_studio',
  ],
  guest: [
    'view_site',
  ],
};

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return permissions.some(p => rolePermissions.includes(p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return permissions.every(p => rolePermissions.includes(p));
}

// Project-level role permissions
const PROJECT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
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

export function getProjectPermissions(projectRole: string): Permission[] {
  return PROJECT_ROLE_PERMISSIONS[projectRole] || [];
}

export function hasProjectPermission(projectRole: string, permission: Permission): boolean {
  return getProjectPermissions(projectRole).includes(permission);
}

// Determine user's global role based on profile
export function determineUserRole(profile: any): UserRole {
  if (profile?.is_admin) return 'admin';
  // For now, all registered users are project creators
  // This can be refined based on additional criteria
  return 'project_creator';
}
