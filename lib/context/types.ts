// Comprehensive type definitions for role-based access control

export type UserRole = 'admin' | 'project_creator' | 'crew_member' | 'guest';

export type Permission =
  | 'view_site'
  | 'create_project'
  | 'edit_project'
  | 'delete_project'
  | 'manage_crew'
  | 'create_script'
  | 'edit_script'
  | 'delete_script'
  | 'create_job'
  | 'edit_job'
  | 'delete_job'
  | 'manage_portfolio'
  | 'access_studio'
  | 'manage_users'
  | 'view_analytics';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  role: string; // specialty role (Director, Editor, etc.)
  location?: string;
  status: 'OPEN' | 'BUSY';
  is_admin?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectAccess {
  projectId: string;
  userRole: 'owner' | 'lead' | 'contributor' | 'viewer';
  permissions: Permission[];
  canEdit: boolean;
  canDelete: boolean;
  canManageCrew: boolean;
  canViewScripts: boolean;
  canEditScripts: boolean;
  canCreateScripts: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  userRole: UserRole;
  isLoading: boolean;
  error: string | null;
  permissions: Permission[];
  projectAccess: Record<string, ProjectAccess>;
}

export interface AccessCheckContext {
  canPerformAction: (action: Permission, context?: AccessContext) => boolean;
  checkProjectAccess: (projectId: string, permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  getCurrentUser: () => UserProfile | null;
}

export interface AccessContext {
  projectId?: string;
  scriptId?: string;
  jobId?: string;
  userId?: string;
  resource?: 'project' | 'script' | 'job' | 'portfolio';
}

export interface ProjectAccessConfig {
  projectId: string;
  userId: string;
  creatorId: string;
  crewMembers: Array<{ userId: string; role: string }>;
  isPublic: boolean;
}
