import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript, setVisibility } from './support/project';

// Role model, step 3b: an invitation can be answered, and only an accepted one gives access. Sam owns the project, Jordan is
// confirmed crew, Riley is the person Sam invites (an outsider until they accept).
let cast: Cast;
let projectId: string;
let scriptId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Invitations'));
  scriptId = await createScript(cast, projectId, 'INT. ROOM - DAY\n');
});
afterAll(async () => { await destroyCast(cast); });

const riley = () => cast.riley.client;
const sam = () => cast.sam.client;

/** Sam invites Riley (as crew, with a craft); the row starts pending. */
const invite = async (role = 'contributor', craft: string | null = 'Sound designer') => {
  await adminClient().from('project_crew').delete().eq('project_id', projectId).eq('user_id', cast.riley.id);
  const r = await sam().from('project_crew').insert({ project_id: projectId, user_id: cast.riley.id, role, craft, status: 'pending', invited_by: cast.sam.id });
  expect(r.error).toBeNull();
};
const row = async () => (await adminClient().from('project_crew').select('status, role, craft').eq('project_id', projectId).eq('user_id', cast.riley.id).single()).data!;
const rileyReads = async () => ({
  project: (await riley().from('projects').select('id').eq('id', projectId)).data?.length ?? 0,
  script: (await riley().from('scripts').select('id').eq('id', scriptId)).data?.length ?? 0,
});

describe('an open invitation', () => {
  it('shows the invitee its title, craft, access and who invited them, and nothing more', async () => {
    await invite('viewer', 'Sound designer');
    const { data, error } = await riley().rpc('my_crew_invitations');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ project_id: projectId, title: 'Invitations', role: 'viewer', craft: 'Sound designer', invited_by_name: expect.any(String) });
  });

  it('does not let the invitee read the project yet (it used to)', async () => {
    await invite();
    expect(await rileyReads()).toEqual({ project: 0, script: 0 });
  });

  it('lists only your own invitations: Jordan, who is confirmed, has none; the owner has none', async () => {
    await invite();
    expect((await cast.jordan.client.rpc('my_crew_invitations')).data).toHaveLength(0);
    expect((await sam().rpc('my_crew_invitations')).data).toHaveLength(0);
  });

  it('cannot be answered by writing the row: only the owner updates a crew row', async () => {
    await invite();
    const u = await riley().from('project_crew').update({ status: 'confirmed' }).eq('project_id', projectId).eq('user_id', cast.riley.id).select('id');
    expect(u.data ?? []).toHaveLength(0);
    expect((await row()).status).toBe('pending');
  });

  it('is not answerable by anyone else, or when signed out', async () => {
    await invite();
    const byJordan = await cast.jordan.client.rpc('respond_to_crew_invitation', { p_project: projectId, p_accept: true });
    expect(byJordan.error).not.toBeNull();
    expect((await row()).status).toBe('pending');
    const anon = await anonClient().rpc('respond_to_crew_invitation', { p_project: projectId, p_accept: true });
    expect(anon.error).not.toBeNull();
    expect((await anonClient().rpc('my_crew_invitations')).error).not.toBeNull();
  });
});

describe('accepting', () => {
  it('makes them crew with exactly the access and craft they were offered, and tells the person who invited them', async () => {
    await invite('contributor', 'Sound designer');
    await adminClient().from('notifications').delete().eq('user_id', cast.sam.id);
    const r = await riley().rpc('respond_to_crew_invitation', { p_project: projectId, p_accept: true });
    expect(r.error).toBeNull();
    expect(await row()).toEqual({ status: 'confirmed', role: 'contributor', craft: 'Sound designer' });
    expect(await rileyReads()).toEqual({ project: 1, script: 1 });
    expect((await riley().rpc('my_crew_invitations')).data).toHaveLength(0);
    const told = await adminClient().from('notifications').select('title, user_id').eq('user_id', cast.sam.id).eq('type', 'crew');
    expect(told.data).toHaveLength(1);
    expect(told.data![0].title).toMatch(/joined the crew/);
  });

  it('cannot be answered twice, and gives a private project nothing', async () => {
    await invite();
    await riley().rpc('respond_to_crew_invitation', { p_project: projectId, p_accept: true });
    const again = await riley().rpc('respond_to_crew_invitation', { p_project: projectId, p_accept: false });
    expect(again.error).not.toBeNull();
    expect((await row()).status).toBe('confirmed');

    // A private project stays closed to every member, accepted or not (the existing rule).
    await setVisibility(cast, projectId, 'private');
    expect(await rileyReads()).toEqual({ project: 0, script: 0 });
    await setVisibility(cast, projectId, 'team');
  });
});

describe('declining', () => {
  it('keeps them out, tells the inviter, and the owner can invite them again', async () => {
    await invite();
    await adminClient().from('notifications').delete().eq('user_id', cast.sam.id);
    const r = await riley().rpc('respond_to_crew_invitation', { p_project: projectId, p_accept: false });
    expect(r.error).toBeNull();
    expect((await row()).status).toBe('declined');
    expect(await rileyReads()).toEqual({ project: 0, script: 0 });
    expect((await riley().rpc('my_crew_invitations')).data).toHaveLength(0);
    const told = await adminClient().from('notifications').select('title').eq('user_id', cast.sam.id).eq('type', 'crew');
    expect(told.data![0].title).toMatch(/declined/);

    // Sam sets it back to pending: the invitation is open again, and Riley still reads nothing.
    const again = await sam().from('project_crew').update({ status: 'pending' }).eq('project_id', projectId).eq('user_id', cast.riley.id).select('id');
    expect(again.data).toHaveLength(1);
    expect((await riley().rpc('my_crew_invitations')).data).toHaveLength(1);
    expect(await rileyReads()).toEqual({ project: 0, script: 0 });
  });
});

describe('what the people on the project still have', () => {
  it('Jordan, confirmed, reads the project as before; a pending person is not counted in what the budget can be read by', async () => {
    await invite();
    expect((await cast.jordan.client.from('projects').select('id').eq('id', projectId)).data).toHaveLength(1);
    const budget = await riley().from('budget_items').select('id').eq('project_id', projectId);
    expect(budget.data ?? []).toHaveLength(0);
    // They also cannot see the crew list of a project they only have an invitation to.
    const crew = await riley().from('project_crew').select('user_id').eq('project_id', projectId);
    expect((crew.data ?? []).map((c) => c.user_id)).toEqual([cast.riley.id]);
  });
});
