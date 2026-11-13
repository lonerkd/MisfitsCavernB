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

import { assignCrewMember, setCrewCraft, updateCrewMemberRole } from './crew-management';

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

describe('setCrewCraft', () => {
  it('changes the craft, records it, and tells the person', async () => {
    useFake({ project_crew: { data: [{ user_id: 'user-2', craft: 'Gaffer' }], error: null } });

    const row = await setCrewCraft('project-1', 'user-2', 'Gaffer', 'user-1');

    expect(row).toEqual({ user_id: 'user-2', craft: 'Gaffer' });
    expect(logActivity).toHaveBeenCalledWith("set a crew member's craft to Gaffer", 'project', 'project-1');
    expect(logAuditAction).toHaveBeenCalledWith('user-1', 'crew_role_changed', 'project_crew', 'project-1:user-2', { craft: 'Gaffer', action: 'craft_updated' });
    expect(notify).toHaveBeenCalledWith('user-2', expect.objectContaining({ title: 'Your craft is now Gaffer' }), 'user-1');
  });

  it('says so when nothing was updated (row security hides a row you may not change)', async () => {
    useFake({ project_crew: { data: [], error: null } });

    await expect(setCrewCraft('project-1', 'user-2', 'Gaffer', 'user-3')).rejects.toThrow(/cannot change/);
    expect(logAuditAction).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('throws the database error, and does not tell yourself about your own change', async () => {
    useFake({ project_crew: { data: null, error: { message: 'insert or update violates foreign key constraint' } } });
    await expect(setCrewCraft('project-1', 'user-2', 'Not a craft', 'user-1')).rejects.toMatchObject({ message: expect.stringMatching(/foreign key/) });

    useFake({ project_crew: { data: [{ user_id: 'user-1', craft: null }], error: null } });
    await setCrewCraft('project-1', 'user-1', null, 'user-1');
    expect(logActivity).toHaveBeenCalledWith("cleared a crew member's craft", 'project', 'project-1');
    expect(notify).not.toHaveBeenCalled();
  });
});
