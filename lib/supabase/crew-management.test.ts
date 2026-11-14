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

import { assignCrewMember, getMyInvitations, respondToInvitation, setCrewCraft, updateCrewMemberRole } from './crew-management';

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

describe('answering an invitation', () => {
  it('reads the open invitations through the database function', async () => {
    const inv = { project_id: 'p1', title: 'Night Shift', role: 'contributor', craft: 'Gaffer', invited_by_name: 'sam', created_at: '2026-11-14' };
    const fake = useFake({}, { my_crew_invitations: { data: [inv], error: null } });

    await expect(getMyInvitations()).resolves.toEqual([inv]);
    expect(fake.calls.map((c) => c.table)).toContain('rpc:my_crew_invitations');
  });

  it('says so when the invitations cannot be read, and gives none when there are none', async () => {
    useFake({}, { my_crew_invitations: { data: null, error: { message: 'boom' } } });
    await expect(getMyInvitations()).rejects.toMatchObject({ message: 'boom' });
    useFake({}, { my_crew_invitations: { data: null, error: null } });
    await expect(getMyInvitations()).resolves.toEqual([]);
  });

  it('accepts or declines the project it is given, and passes the refusal on', async () => {
    const fake = useFake({}, { respond_to_crew_invitation: { data: null, error: null } });
    await respondToInvitation('p1', true);
    await respondToInvitation('p1', false);
    const sent = fake.calls.filter((c) => c.table === 'rpc:respond_to_crew_invitation').map((c) => c.args[0]);
    expect(sent).toEqual([{ p_project: 'p1', p_accept: true }, { p_project: 'p1', p_accept: false }]);

    useFake({}, { respond_to_crew_invitation: { data: null, error: { message: 'There is no open invitation to answer' } } });
    await expect(respondToInvitation('p1', true)).rejects.toMatchObject({ message: expect.stringMatching(/no open invitation/) });
  });
});
