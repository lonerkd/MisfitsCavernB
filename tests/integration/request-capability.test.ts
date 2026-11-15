import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Role model, step 5: a refused role can ask the owner for the permission. Sam owns, Jordan is crew, Riley is outside.
let cast: Cast;
let projectId: string;

beforeAll(async () => { cast = await createCast(); ({ projectId } = await createCrewedProject(cast, 'Requests')); });
afterAll(async () => { await destroyCast(cast); });

const owed = async () => (await adminClient().from('notifications').select('title, body, link, created_by, read').eq('user_id', cast.sam.id).eq('type', 'crew')).data ?? [];
const setJordan = async (craft: string | null, role = 'contributor') => {
  const u = await cast.sam.client.from('project_crew').update({ craft, role, status: 'confirmed' }).eq('project_id', projectId).eq('user_id', cast.jordan.id).select('user_id');
  expect(u.data).toHaveLength(1);
};
beforeEach(async () => {
  await adminClient().from('notifications').delete().eq('user_id', cast.sam.id);
  await cast.sam.client.from('crew_capability_overrides').delete().eq('project_id', projectId).eq('user_id', cast.jordan.id);
  await setJordan(null);
});
const ask = (who: 'sam' | 'jordan' | 'riley', capability: string) => cast[who].client.rpc('request_capability', { p_project: projectId, p_capability: capability });

describe('request_capability', () => {
  it('tells the owner who asked, in which craft, for what, and where to change it', async () => {
    await setJordan('Casting director');
    const r = await ask('jordan', 'budget.read');
    expect(r.error).toBeNull();
    const n = await owed();
    expect(n).toHaveLength(1);
    expect(n[0].title).toMatch(/asks for access: see the budget$/);
    expect(n[0].body).toContain('as Casting director');
    expect(n[0].link).toBe(`/studio?project=${projectId}&tab=production&view=crew`);
    expect(n[0].created_by).toBe(cast.jordan.id);
  });

  it('grants nothing: the person still lacks it, and cannot grant it to themselves', async () => {
    await ask('jordan', 'budget.write');
    expect((await cast.jordan.client.rpc('my_capabilities', { pid: projectId })).data).not.toContain('budget.write');
    const self = await cast.jordan.client.from('crew_capability_overrides').insert({ project_id: projectId, user_id: cast.jordan.id, capability: 'budget.write', granted: true });
    expect(self.error).not.toBeNull();
  });

  it('asking again while the first request is unread does nothing; after it is read it can be asked again', async () => {
    await ask('jordan', 'casting.decide');
    await ask('jordan', 'casting.decide');
    expect(await owed()).toHaveLength(1);
    await adminClient().from('notifications').update({ read: true }).eq('user_id', cast.sam.id);
    await ask('jordan', 'casting.decide');
    expect(await owed()).toHaveLength(2);
  });

  it('different permissions are different requests', async () => {
    await ask('jordan', 'budget.read');
    await ask('jordan', 'paperwork.read');
    expect(await owed()).toHaveLength(2);
  });

  it('asking for what you already hold, or as the owner, does nothing', async () => {
    await setJordan('Production accountant');
    expect((await ask('jordan', 'budget.read')).error).toBeNull();
    expect((await ask('sam', 'budget.read')).error).toBeNull();
    expect(await owed()).toHaveLength(0);
  });

  it('refuses an outsider, someone only invited, an unknown permission and a signed-out caller', async () => {
    expect((await ask('riley', 'budget.read')).error).not.toBeNull();
    await adminClient().from('project_crew').update({ status: 'pending' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect((await ask('jordan', 'budget.read')).error).not.toBeNull();
    await adminClient().from('project_crew').update({ status: 'confirmed' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect((await ask('jordan', 'not.a.permission')).error).not.toBeNull();
    expect((await anonClient().rpc('request_capability', { p_project: projectId, p_capability: 'budget.read' })).error).not.toBeNull();
    expect(await owed()).toHaveLength(0);
  });

  it('a view-only member can ask too (they can read the project), and the owner decides', async () => {
    await setJordan('Client', 'viewer');
    expect((await ask('jordan', 'budget.read')).error).toBeNull();
    expect(await owed()).toHaveLength(1);
  });
});
