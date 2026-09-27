import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Promo campaigns as personas: any platform the team names (no preset list),
// three stages, bounded names and money; outsiders see nothing.
let cast: Cast;
let projectId: string;
let campaignId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Campaigns'));
});

afterAll(async () => {
  await destroyCast(cast);
});

describe('campaigns', () => {
  it('crew add a campaign on a platform of their own naming; it starts drafting', async () => {
    const { data, error } = await cast.jordan.client.from('campaigns')
      .insert({ project_id: projectId, title: 'Premiere night', platform: 'Local cinema', created_by: cast.jordan.id, budget: 300 })
      .select('id, status, platform').single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ status: 'drafting', platform: 'Local cinema' });
    campaignId = data!.id;
  });

  it('a platform must be named; stages, names and money are bounded', async () => {
    const c = cast.jordan.client;
    const base = { project_id: projectId, title: 'x', created_by: cast.jordan.id };
    expect((await c.from('campaigns').insert({ ...base } as never)).error).not.toBeNull();
    expect((await c.from('campaigns').insert({ ...base, platform: '  ' })).error).not.toBeNull();
    expect((await c.from('campaigns').insert({ ...base, platform: 'x'.repeat(61) })).error).not.toBeNull();
    expect((await c.from('campaigns').insert({ ...base, platform: 'Press', budget: -1 })).error).not.toBeNull();
    expect((await c.from('campaigns').update({ status: 'Drafting' }).eq('id', campaignId)).error).not.toBeNull();
  });

  it('the team moves it through its stages and records spend', async () => {
    const { data, error } = await cast.sam.client.from('campaigns').update({ status: 'live', spend: 120 }).eq('id', campaignId).select('status, spend').single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ status: 'live', spend: 120 });
  });

  it('outsiders see and change nothing', async () => {
    expect((await cast.riley.client.from('campaigns').select('id').eq('project_id', projectId)).data).toEqual([]);
    const { data } = await cast.riley.client.from('campaigns').update({ status: 'wrapped' }).eq('id', campaignId).select('id');
    expect(data).toEqual([]);
  });
});
