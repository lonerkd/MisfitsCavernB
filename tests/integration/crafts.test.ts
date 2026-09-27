import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// One crafts list for the suite: readable by everyone, extended by admins,
// and the only values profiles, jobs and crew can hold. Renames follow
// through everywhere; crew permission levels are no longer job titles.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Crafts'));
});

afterAll(async () => {
  await adminClient().from('crafts').delete().in('name', ['Puppeteer', 'Puppet wrangler']);
  await destroyCast(cast);
});

describe('the list', () => {
  it('everyone can read it, signed in or not, grouped by department', async () => {
    const { data, error } = await anonClient().from('crafts').select('name, department').order('position');
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(40);
    expect(data!.map((c) => c.name)).toEqual(expect.arrayContaining(['Director', 'Gaffer', 'Sound designer', 'Multi-hyphenate', 'Other']));
  });

  it('only admins change it', async () => {
    const byUser = await cast.sam.client.from('crafts').insert({ name: 'Puppeteer', department: 'Performance', color: '#22d3ee' });
    expect(byUser.error).not.toBeNull();
    await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.riley.id);
    const byAdmin = await cast.riley.client.from('crafts').insert({ name: 'Puppeteer', department: 'Performance', color: '#22d3ee', position: 103 });
    expect(byAdmin.error).toBeNull();
    await adminClient().from('profiles').update({ is_admin: false }).eq('id', cast.riley.id);
  });
});

describe('profiles, jobs and crew hold crafts from the list', () => {
  it('a profile’s craft must be on the list', async () => {
    expect((await cast.jordan.client.from('profiles').update({ role: 'Gaffer' }).eq('id', cast.jordan.id)).error).toBeNull();
    expect((await cast.jordan.client.from('profiles').update({ role: 'Space cowboy' }).eq('id', cast.jordan.id)).error).not.toBeNull();
  });

  it('a job’s craft must be on the list', async () => {
    const ok = await cast.sam.client.from('jobs').insert({ title: 'Night gaffer', role: 'Gaffer', created_by: cast.sam.id, project_id: projectId, status: 'open' });
    expect(ok.error).toBeNull();
    const bad = await cast.sam.client.from('jobs').insert({ title: 'x', role: 'Gaffing', created_by: cast.sam.id, project_id: projectId, status: 'open' });
    expect(bad.error).not.toBeNull();
  });

  it('crew have a craft and a permission level — a job title is not a permission', async () => {
    const { data: crew } = await cast.sam.client.from('project_crew').select('role, craft').eq('project_id', projectId).eq('user_id', cast.jordan.id).single();
    expect(crew).toEqual({ role: 'contributor', craft: 'Production designer' });
    const titleAsRole = await cast.sam.client.from('project_crew').update({ role: 'Gaffer' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect(titleAsRole.error).not.toBeNull();
    expect((await cast.sam.client.from('project_crew').update({ role: 'lead' }).eq('project_id', projectId).eq('user_id', cast.jordan.id)).error).toBeNull();
  });

  it('renaming a craft follows through to profiles, jobs and crew', async () => {
    const admin = adminClient();
    await cast.jordan.client.from('profiles').update({ role: 'Puppeteer' }).eq('id', cast.jordan.id);
    await cast.sam.client.from('project_crew').update({ craft: 'Puppeteer' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    await cast.sam.client.from('jobs').insert({ title: 'Puppets', role: 'Puppeteer', created_by: cast.sam.id, project_id: projectId, status: 'open' });

    expect((await admin.from('crafts').update({ name: 'Puppet wrangler' }).eq('name', 'Puppeteer')).error).toBeNull();
    expect((await admin.from('profiles').select('role').eq('id', cast.jordan.id).single()).data?.role).toBe('Puppet wrangler');
    expect((await admin.from('project_crew').select('craft').eq('project_id', projectId).eq('user_id', cast.jordan.id).single()).data?.craft).toBe('Puppet wrangler');
    expect((await admin.from('jobs').select('role').eq('title', 'Puppets').eq('project_id', projectId).single()).data?.role).toBe('Puppet wrangler');

    // A craft still in use by a job can't be deleted out from under it.
    expect((await admin.from('crafts').delete().eq('name', 'Puppet wrangler')).error).not.toBeNull();
    await admin.from('jobs').delete().eq('title', 'Puppets').eq('project_id', projectId);
  });
});
