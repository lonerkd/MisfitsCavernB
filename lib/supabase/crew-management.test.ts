import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFake } from '@/tests/unit-support/fakeSupabase';

const { logActivity, logAuditAction, notify } = vi.hoisted(() => ({
  logActivity: vi.fn(),
  logAuditAction: vi.fn(),
  notify: vi.fn(),
}));
vi.mock('./client', async () => ({ supabase: (await import('@/tests/unit-support/fakeSupabase')).supabaseProxy }));
vi.mock('./activity', () => ({ logActivity }));
vi.mock('./audit', () => ({ logAuditAction }));
vi.mock('./notifications', () => ({ notify }));

import { assignCrewMember, updateCrewMemberRole } from './crew-management';

beforeEach(() => vi.clearAllMocks());

describe('crew activity', () => {
  it('records a project-scoped crew assignment', async () => {
    useFake({ project_crew: { data: { id: 'crew-row' }, error: null } });

    await assignCrewMember('project-1', 'user-2', 'contributor', 'user-1');

    expect(logActivity).toHaveBeenCalledWith('assigned a crew member as contributor', 'project', 'project-1');
  });

  it('records a project-scoped role change', async () => {
    useFake({ project_crew: { data: { id: 'crew-row' }, error: null } });

    await updateCrewMemberRole('project-1', 'user-2', 'viewer', 'user-1');

    expect(logActivity).toHaveBeenCalledWith("changed a crew member's role to viewer", 'project', 'project-1');
  });
});
