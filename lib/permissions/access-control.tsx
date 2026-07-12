'use client';

import React from 'react';
import { Permission, AccessContext } from '@/lib/context/types';
import { useAuth } from '@/lib/context/AuthContext';

interface ActionButtonProps {
  permission: Permission;
  context?: AccessContext;
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
  disabledTooltip?: string;
}

export function ActionButton({
  permission,
  context,
  children,
  onClick,
  style,
  className,
  title,
  disabledTooltip,
}: ActionButtonProps) {
  const { canPerformAction } = useAuth();
  const hasPermission = canPerformAction(permission, context);

  return (
    <button
      onClick={onClick}
      disabled={!hasPermission}
      style={style}
      className={className}
      title={hasPermission ? title : disabledTooltip || 'You do not have permission to perform this action'}
    >
      {children}
    </button>
  );
}

interface IfAccessProps {
  permission: Permission;
  context?: AccessContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function IfAccess({ permission, context, children, fallback }: IfAccessProps) {
  const { canPerformAction } = useAuth();
  const hasPermission = canPerformAction(permission, context);

  return <>{hasPermission ? children : fallback}</>;
}

interface ProtectedPageProps {
  requiredPermission: Permission;
  context?: AccessContext;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedPage({
  requiredPermission,
  context,
  children,
  fallback,
}: ProtectedPageProps) {
  const { canPerformAction, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.5 }}>LOADING...</div>
      </div>
    );
  }

  const hasPermission = canPerformAction(requiredPermission, context);

  if (!hasPermission) {
    return (
      fallback || (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'var(--mono)',
          color: 'var(--fg)',
        }}>
          <h1 style={{ fontSize: '2rem', letterSpacing: 2, marginBottom: 16 }}>ACCESS DENIED</h1>
          <p style={{ fontSize: 11, opacity: 0.6 }}>You do not have permission to access this page.</p>
        </div>
      )
    );
  }

  return <>{children}</>;
}

interface PageAccessConfig {
  path: string;
  requiredPermission: Permission;
  description: string;
}

export const PAGE_ACCESS_CONFIG: Record<string, PageAccessConfig> = {
  '/profile': {
    path: '/profile',
    requiredPermission: 'view_site',
    description: 'User profile',
  },
  '/editor': {
    path: '/editor',
    requiredPermission: 'view_site',
    description: 'Script editor',
  },
  '/projects': {
    path: '/projects',
    requiredPermission: 'view_site',
    description: 'Projects list',
  },
  '/projects/create': {
    path: '/projects/create',
    requiredPermission: 'create_project',
    description: 'Create new project',
  },
  '/projects/[id]': {
    path: '/projects/[id]',
    requiredPermission: 'view_site',
    description: 'Project details',
  },
  '/jobs': {
    path: '/jobs',
    requiredPermission: 'view_site',
    description: 'Jobs board',
  },
  '/jobs/post': {
    path: '/jobs/post',
    requiredPermission: 'create_job',
    description: 'Post a job',
  },
  '/portfolio': {
    path: '/portfolio',
    requiredPermission: 'manage_portfolio',
    description: 'Manage portfolio',
  },
  '/studio': {
    path: '/studio',
    requiredPermission: 'access_studio',
    description: 'Studio (mood board)',
  },
  '/admin': {
    path: '/admin',
    requiredPermission: 'manage_users',
    description: 'Admin panel',
  },
};

interface ProjectActionConfig {
  action: string;
  permission: Permission;
  description: string;
}

export const PROJECT_ACTION_PERMISSIONS: Record<string, ProjectActionConfig> = {

  'project.edit': {
    action: 'project.edit',
    permission: 'edit_project',
    description: 'Edit project details',
  },
  'project.delete': {
    action: 'project.delete',
    permission: 'delete_project',
    description: 'Delete project',
  },
  'project.manage_crew': {
    action: 'project.manage_crew',
    permission: 'manage_crew',
    description: 'Manage project crew',
  },

  'script.create': {
    action: 'script.create',
    permission: 'create_script',
    description: 'Create new script',
  },
  'script.edit': {
    action: 'script.edit',
    permission: 'edit_script',
    description: 'Edit script',
  },
  'script.delete': {
    action: 'script.delete',
    permission: 'delete_script',
    description: 'Delete script',
  },

  'job.create': {
    action: 'job.create',
    permission: 'create_job',
    description: 'Create job posting',
  },
  'job.edit': {
    action: 'job.edit',
    permission: 'edit_job',
    description: 'Edit job posting',
  },
  'job.delete': {
    action: 'job.delete',
    permission: 'delete_job',
    description: 'Delete job posting',
  },
};
