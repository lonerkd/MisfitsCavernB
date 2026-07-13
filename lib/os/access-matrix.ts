

import { UserRole, Permission } from '@/lib/context/types';

export interface AccessMatrix {
  role: UserRole;
  pageAccess: Record<string, boolean>;
  projectAccess: Record<string, Record<'owner' | 'lead' | 'contributor' | 'viewer', boolean>>;
  actionAccess: Record<string, boolean>;
}

export const ACCESS_MATRIX: Record<UserRole, AccessMatrix> = {
  admin: {
    role: 'admin',
    pageAccess: {
      '/': true,
      '/auth': false,
      '/profile': true,
      '/editor': true,
      '/projects': true,
      '/projects/create': true,
      '/projects/[id]': true,
      '/jobs': true,
      '/jobs/[id]': true,
      '/jobs/post': true,
      '/portfolio': true,
      '/portfolio/manage': true,
      '/studio': true,
      '/crew': true,
      '/crew/[id]': true,
      '/lounge': true,
      '/admin': true,
      '/admin/users': true,
      '/admin/analytics': true,
    },
    projectAccess: {

      'edit_project': {
        owner: true,
        lead: true,
        contributor: true,
        viewer: true,
      },
      'delete_project': {
        owner: true,
        lead: true,
        contributor: true,
        viewer: true,
      },
      'manage_crew': {
        owner: true,
        lead: true,
        contributor: true,
        viewer: true,
      },
      'create_script': {
        owner: true,
        lead: true,
        contributor: true,
        viewer: true,
      },
      'edit_script': {
        owner: true,
        lead: true,
        contributor: true,
        viewer: true,
      },
      'delete_script': {
        owner: true,
        lead: true,
        contributor: true,
        viewer: true,
      },
    },
    actionAccess: {

      'project.edit': true,
      'project.delete': true,
      'project.manage_crew': true,
      'project.publish': true,
      'project.archive': true,

      'script.create': true,
      'script.edit': true,
      'script.delete': true,
      'script.publish': true,
      'script.share': true,

      'job.create': true,
      'job.edit': true,
      'job.delete': true,
      'job.close': true,

      'portfolio.add_media': true,
      'portfolio.edit_media': true,
      'portfolio.delete_media': true,
      'portfolio.publish': true,

      'user.edit_profile': true,
      'user.manage_roles': true,
      'user.view_analytics': true,
    },
  },

  project_creator: {
    role: 'project_creator',
    pageAccess: {
      '/': true,
      '/auth': false,
      '/profile': true,
      '/editor': true,
      '/projects': true,
      '/projects/create': true,
      '/projects/[id]': true,
      '/jobs': true,
      '/jobs/[id]': true,
      '/jobs/post': true,
      '/portfolio': true,
      '/portfolio/manage': true,
      '/studio': true,
      '/crew': true,
      '/crew/[id]': true,
      '/lounge': true,
      '/admin': false,
      '/admin/users': false,
      '/admin/analytics': false,
    },
    projectAccess: {
      'edit_project': {
        owner: true,
        lead: true,
        contributor: false,
        viewer: false,
      },
      'delete_project': {
        owner: true,
        lead: false,
        contributor: false,
        viewer: false,
      },
      'manage_crew': {
        owner: true,
        lead: true,
        contributor: false,
        viewer: false,
      },
      'create_script': {
        owner: true,
        lead: true,
        contributor: true,
        viewer: false,
      },
      'edit_script': {
        owner: true,
        lead: true,
        contributor: true,
        viewer: false,
      },
      'delete_script': {
        owner: true,
        lead: true,
        contributor: false,
        viewer: false,
      },
    },
    actionAccess: {
      'project.edit': true,
      'project.delete': true,
      'project.manage_crew': true,
      'project.publish': true,
      'project.archive': true,

      'script.create': true,
      'script.edit': true,
      'script.delete': true,
      'script.publish': true,
      'script.share': true,

      'job.create': true,
      'job.edit': true,
      'job.delete': true,
      'job.close': true,

      'portfolio.add_media': true,
      'portfolio.edit_media': true,
      'portfolio.delete_media': true,
      'portfolio.publish': true,

      'user.edit_profile': true,
      'user.manage_roles': false,
      'user.view_analytics': true,
    },
  },

  crew_member: {
    role: 'crew_member',
    pageAccess: {
      '/': true,
      '/auth': false,
      '/profile': true,
      '/editor': true,
      '/projects': true,
      '/projects/create': false,
      '/projects/[id]': true,
      '/jobs': true,
      '/jobs/[id]': true,
      '/jobs/post': false,
      '/portfolio': true,
      '/portfolio/manage': true,
      '/studio': true,
      '/crew': true,
      '/crew/[id]': true,
      '/lounge': true,
      '/admin': false,
      '/admin/users': false,
      '/admin/analytics': false,
    },
    projectAccess: {
      'edit_project': {
        owner: false,
        lead: false,
        contributor: false,
        viewer: false,
      },
      'delete_project': {
        owner: false,
        lead: false,
        contributor: false,
        viewer: false,
      },
      'manage_crew': {
        owner: false,
        lead: false,
        contributor: false,
        viewer: false,
      },
      'create_script': {
        owner: true,
        lead: true,
        contributor: true,
        viewer: false,
      },
      'edit_script': {
        owner: true,
        lead: true,
        contributor: true,
        viewer: false,
      },
      'delete_script': {
        owner: true,
        lead: true,
        contributor: false,
        viewer: false,
      },
    },
    actionAccess: {
      'project.edit': false,
      'project.delete': false,
      'project.manage_crew': false,
      'project.publish': false,
      'project.archive': false,

      'script.create': true,
      'script.edit': true,
      'script.delete': false,
      'script.publish': false,
      'script.share': false,

      'job.create': false,
      'job.edit': false,
      'job.delete': false,
      'job.close': false,

      'portfolio.add_media': true,
      'portfolio.edit_media': true,
      'portfolio.delete_media': false,
      'portfolio.publish': false,

      'user.edit_profile': true,
      'user.manage_roles': false,
      'user.view_analytics': false,
    },
  },

  guest: {
    role: 'guest',
    pageAccess: {
      '/': true,
      '/auth': true,
      '/profile': false,
      '/editor': false,
      '/projects': false,
      '/projects/create': false,
      '/projects/[id]': false,
      '/jobs': false,
      '/jobs/[id]': false,
      '/jobs/post': false,
      '/portfolio': false,
      '/portfolio/manage': false,
      '/studio': false,
      '/crew': true,
      '/crew/[id]': true,
      '/lounge': false,
      '/admin': false,
      '/admin/users': false,
      '/admin/analytics': false,
    },
    projectAccess: {
      'edit_project': {
        owner: false,
        lead: false,
        contributor: false,
        viewer: false,
      },
      'delete_project': {
        owner: false,
        lead: false,
        contributor: false,
        viewer: false,
      },
      'manage_crew': {
        owner: false,
        lead: false,
        contributor: false,
        viewer: false,
      },
      'create_script': {
        owner: false,
        lead: false,
        contributor: false,
        viewer: false,
      },
      'edit_script': {
        owner: false,
        lead: false,
        contributor: false,
        viewer: false,
      },
      'delete_script': {
        owner: false,
        lead: false,
        contributor: false,
        viewer: false,
      },
    },
    actionAccess: {
      'project.edit': false,
      'project.delete': false,
      'project.manage_crew': false,
      'project.publish': false,
      'project.archive': false,

      'script.create': false,
      'script.edit': false,
      'script.delete': false,
      'script.publish': false,
      'script.share': false,

      'job.create': false,
      'job.edit': false,
      'job.delete': false,
      'job.close': false,

      'portfolio.add_media': false,
      'portfolio.edit_media': false,
      'portfolio.delete_media': false,
      'portfolio.publish': false,

      'user.edit_profile': false,
      'user.manage_roles': false,
      'user.view_analytics': false,
    },
  },
};

export function canAccessPage(role: UserRole, path: string): boolean {
  return ACCESS_MATRIX[role]?.pageAccess[path] || false;
}

export function canPerformAction(role: UserRole, action: string): boolean {
  return ACCESS_MATRIX[role]?.actionAccess[action] || false;
}

export function getAccessSummary(role: UserRole): string {
  const matrix = ACCESS_MATRIX[role];
  const accessiblePages = Object.entries(matrix.pageAccess)
    .filter(([, access]) => access)
    .map(([page]) => page);

  const availableActions = Object.entries(matrix.actionAccess)
    .filter(([, access]) => access)
    .map(([action]) => action);

  return `
Role: ${role}
Accessible Pages: ${accessiblePages.length}
Available Actions: ${availableActions.length}
`;
}
