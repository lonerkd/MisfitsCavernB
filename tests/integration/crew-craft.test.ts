import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Role model, step 1: a person's craft on a project (what they do) is its own column, apart from
// their permission tier (what they may do). Sam owns, Jordan is crew, Riley is outside.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Crafts on a crew'));
});
afterAll(async () => { await destroyCast(cast); });

const invite = (who: 'sam' | 'jordan' | 'riley', row: Record<string, unknown>) =>
  cast[who].client.from('project_crew').insert({ project_id: projectId, user_id: cast.riley.id, ...row }).select('role, craft').single();

describe('inviting with a craft', () => {
  it('the permission tier takes only lead, contributor or viewer: a craft written into it is refused (the old Recruit bug)', async () => {
    for (const bad of ['Sound Mixer', 'Production Assistant', 'Director']) {
      const r = await invite('sam', { role: bad, status: 'pending' });
      expect(r.error?.message, bad).toMatch(/project_crew_role_check|violates check constraint/);
    }
  });

  it('the owner invites someone as a tier and a craft; the craft must be in the catalogue', async () => {
    const bad = await invite('sam', { role: 'contributor', craft: 'Not a real craft', status: 'pending' });
    expect(bad.error).not.toBeNull();
    const ok = await invite('sam', { role: 'contributor', craft: 'Production sound mixer', status: 'pending' });
    expect(ok.error).toBeNull();
    expect(ok.data).toEqual({ role: 'contributor', craft: 'Production sound mixer' });
  });

  it('crew cannot invite anyone, and an outsider cannot either', async () => {
    expect((await invite('jordan', { role: 'viewer', status: 'pending' })).error).not.toBeNull();
    expect((await invite('riley', { role: 'lead', status: 'confirmed' })).error).not.toBeNull();
  });
});

describe('changing a craft', () => {
  const setCraft = (who: 'sam' | 'jordan' | 'riley', userId: string, craft: string | null) =>
    cast[who].client.from('project_crew').update({ craft }).eq('project_id', projectId).eq('user_id', userId).select('user_id, craft');

  it('the owner changes and clears anyone’s craft, and the tier is untouched', async () => {
    const set = await setCraft('sam', cast.jordan.id, 'Gaffer');
    expect(set.error).toBeNull();
    expect(set.data).toEqual([{ user_id: cast.jordan.id, craft: 'Gaffer' }]);
    expect((await setCraft('sam', cast.jordan.id, null)).data).toEqual([{ user_id: cast.jordan.id, craft: null }]);
    const row = (await cast.sam.client.from('project_crew').select('role').eq('project_id', projectId).eq('user_id', cast.jordan.id).single()).data;
    expect(row?.role).toBe('contributor');
  });

  it('crew cannot change their own craft or anyone else’s (nothing is updated)', async () => {
    expect((await setCraft('jordan', cast.jordan.id, 'Director')).data ?? []).toEqual([]);
    expect((await setCraft('jordan', cast.riley.id, 'Director')).data ?? []).toEqual([]);
    const now = (await cast.sam.client.from('project_crew').select('craft').eq('project_id', projectId).eq('user_id', cast.jordan.id).single()).data;
    expect(now?.craft).toBeNull();
  });

  it('an outsider changes nothing and sees no crew', async () => {
    // Riley was invited above; take the invitation back so they are outside again.
    expect((await cast.sam.client.from('project_crew').delete().eq('project_id', projectId).eq('user_id', cast.riley.id)).error).toBeNull();
    expect((await setCraft('riley', cast.jordan.id, 'Director')).data ?? []).toEqual([]);
    expect((await cast.riley.client.from('project_crew').select('user_id').eq('project_id', projectId)).data ?? []).toEqual([]);
    expect((await cast.sam.client.from('project_crew').select('craft').eq('project_id', projectId).eq('user_id', cast.jordan.id).single()).data?.craft).toBeNull();
  });
});
