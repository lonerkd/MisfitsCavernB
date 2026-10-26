import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, type Cast } from './support/personas';

// Case studies: an admin (Sam) may link a case study to a production only if
// its owner (Jordan) opted in; the opt-in is the owner's alone; withdrawing it
// pulls the case study back to draft; readers (Riley) get the production's
// title only through a published, consented case study.
let cast: Cast;
let production: string;
let other: string;
const posts: string[] = [];

beforeAll(async () => {
  cast = await createCast();
  await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id);
  production = (await cast.jordan.client.from('projects').insert({ title: 'Jordan Film', description: 'A logline', creator_id: cast.jordan.id }).select('id').single()).data!.id;
  other = (await cast.riley.client.from('projects').insert({ title: 'Riley Film', creator_id: cast.riley.id }).select('id').single()).data!.id;
});

afterAll(async () => {
  if (posts.length) await adminClient().from('hub_posts').delete().in('id', posts);
  await adminClient().from('projects').delete().in('id', [production, other]);
  await adminClient().from('profiles').update({ is_admin: false }).eq('id', cast.sam.id);
  await destroyCast(cast);
});

async function study(fields: Record<string, unknown> = {}) {
  const res = await cast.sam.client.from('hub_posts').insert({ kind: 'case_study', title: 'Case', body: 'Story', ...fields }).select('id').single();
  if (res.data) posts.push(res.data.id);
  return res;
}

describe('consent', () => {
  it('cannot link a production whose owner has not agreed', async () => {
    const res = await study({ project_id: production });
    expect(res.error).not.toBeNull();
  });

  it('only a case study may name a production', async () => {
    await cast.jordan.client.from('projects').update({ case_study_ok: true }).eq('id', production);
    const res = await cast.sam.client.from('hub_posts').insert({ kind: 'update', title: 'x', project_id: production });
    expect(res.error).not.toBeNull();
  });

  it('only the owner can give consent', async () => {
    await cast.riley.client.from('projects').update({ case_study_ok: true }).eq('id', production);
    await cast.sam.client.from('projects').update({ case_study_ok: true }).eq('id', other);
    const { data } = await adminClient().from('projects').select('id, case_study_ok').in('id', [production, other]);
    expect(Object.fromEntries(data!.map((p) => [p.id, p.case_study_ok]))).toEqual({ [production]: true, [other]: false });
  });

  it('an admin links a consenting production', async () => {
    const res = await study({ project_id: production, published_at: new Date().toISOString() });
    expect(res.error).toBeNull();
  });
});

describe('reading the production', () => {
  it('admins list consenting productions; others are refused', async () => {
    const list = await cast.sam.client.rpc('admin_case_study_projects');
    expect(list.error).toBeNull();
    expect(list.data!.map((p) => p.id)).toEqual([production]);
    expect((await cast.riley.client.rpc('admin_case_study_projects')).error).not.toBeNull();
  });

  it('a reader gets the title only once the case study is published', async () => {
    const draft = (await study({ project_id: production })).data!.id;
    const live = (await study({ project_id: production, published_at: new Date().toISOString() })).data!.id;
    expect((await cast.riley.client.rpc('hub_case_study_project', { p_post: draft })).data).toEqual([]);
    expect((await cast.riley.client.rpc('hub_case_study_project', { p_post: live })).data).toEqual([{ title: 'Jordan Film', description: 'A logline' }]);
  });

  it('Riley cannot read the project itself', async () => {
    const { data } = await cast.riley.client.from('projects').select('id').eq('id', production);
    expect(data).toEqual([]);
  });
});

describe('withdrawing', () => {
  it('unlinks and unpublishes its case studies, and the title stops resolving', async () => {
    const id = (await study({ project_id: production, published_at: new Date().toISOString() })).data!.id;
    expect((await cast.jordan.client.from('projects').update({ case_study_ok: false }).eq('id', production)).error).toBeNull();
    const { data } = await adminClient().from('hub_posts').select('project_id, published_at').eq('id', id).single();
    expect(data).toEqual({ project_id: null, published_at: null });
    expect((await cast.riley.client.rpc('hub_case_study_project', { p_post: id })).data).toEqual([]);
    expect((await study({ project_id: production })).error).not.toBeNull();
  });
});
