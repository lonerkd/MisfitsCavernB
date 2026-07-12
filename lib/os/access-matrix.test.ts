import { describe, it, expect } from 'vitest';
import { ACCESS_MATRIX, canAccessPage, canPerformAction, getAccessSummary } from './access-matrix';
import type { UserRole } from '@/lib/context/types';

const ROLES = Object.keys(ACCESS_MATRIX) as UserRole[];

describe('ACCESS_MATRIX shape', () => {
  it('defines a matrix for every role, with matching role field', () => {
    for (const role of ROLES) {
      expect(ACCESS_MATRIX[role].role).toBe(role);
      expect(ACCESS_MATRIX[role].pageAccess).toBeTypeOf('object');
      expect(ACCESS_MATRIX[role].actionAccess).toBeTypeOf('object');
    }
  });

  it('all roles gate the same set of pages (no drift between roles)', () => {
    const reference = Object.keys(ACCESS_MATRIX[ROLES[0]].pageAccess).sort();
    for (const role of ROLES.slice(1)) {
      expect(Object.keys(ACCESS_MATRIX[role].pageAccess).sort()).toEqual(reference);
    }
  });

  it('all roles gate the same set of actions', () => {
    const reference = Object.keys(ACCESS_MATRIX[ROLES[0]].actionAccess).sort();
    for (const role of ROLES.slice(1)) {
      expect(Object.keys(ACCESS_MATRIX[role].actionAccess).sort()).toEqual(reference);
    }
  });
});

describe('admin access', () => {
  it('can access admin pages', () => {
    expect(canAccessPage('admin', '/admin')).toBe(true);
    expect(canAccessPage('admin', '/admin/users')).toBe(true);
    expect(canAccessPage('admin', '/admin/analytics')).toBe(true);
  });

  it('can manage roles and view analytics', () => {
    expect(canPerformAction('admin', 'user.manage_roles')).toBe(true);
    expect(canPerformAction('admin', 'user.view_analytics')).toBe(true);
  });
});

describe('non-admin roles are locked out of admin surface', () => {
  const nonAdmins = ROLES.filter(r => r !== 'admin');

  it.each(nonAdmins)('%s cannot access /admin pages', (role) => {
    expect(canAccessPage(role, '/admin')).toBe(false);
    expect(canAccessPage(role, '/admin/users')).toBe(false);
    expect(canAccessPage(role, '/admin/analytics')).toBe(false);
  });

  it.each(nonAdmins)('%s cannot manage user roles', (role) => {
    expect(canPerformAction(role, 'user.manage_roles')).toBe(false);
  });
});

describe('guest (Riley persona) restrictions', () => {
  it('guest cannot perform any destructive project/script actions', () => {
    for (const action of ['project.delete', 'project.edit', 'script.delete', 'job.delete', 'portfolio.delete_media']) {
      expect(canPerformAction('guest', action)).toBe(false);
    }
  });
});

describe('lookup safety', () => {
  it('unknown page returns false, never undefined', () => {
    for (const role of ROLES) {
      expect(canAccessPage(role, '/definitely-not-a-page')).toBe(false);
    }
  });

  it('unknown action returns false', () => {
    for (const role of ROLES) {
      expect(canPerformAction(role, 'nuke.everything')).toBe(false);
    }
  });

  it('unknown role returns false rather than throwing', () => {
    expect(canAccessPage('intruder' as UserRole, '/')).toBe(false);
    expect(canPerformAction('intruder' as UserRole, 'project.edit')).toBe(false);
  });
});

describe('getAccessSummary', () => {
  it.each(ROLES)('produces a summary for %s', (role) => {
    const summary = getAccessSummary(role);
    expect(summary).toContain(`Role: ${role}`);
    expect(summary).toMatch(/Accessible Pages: \d+/);
  });
});
