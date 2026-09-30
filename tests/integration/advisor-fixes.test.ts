import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, adminClient, type Cast } from './support/personas';

// Access rules rewritten from the Supabase advisors' findings (migration
// 20260930010000): sound effects stay inside their project, and splitting
// "write" policies from "read" ones changed nobody's access.
let cast: Cast;
let projectId: string;
let sfxId: string;

beforeAll(async () => {
  cast = await createCast();
  projectId = (await cast.sam.client.from('projects').insert({ title: 'Foley', creator_id: cast.sam.id }).select('id').single()).data!.id;
  expect((await cast.sam.client.from('project_crew').insert({ project_id: projectId, user_id: cast.jordan.id, craft: 'Editor', status: 'confirmed' })).error).toBeNull();
  const sfx = await cast.sam.client.from('sfx_assets')
    .insert({ project_id: projectId, user_id: cast.sam.id, title: 'Door slam', audio_url: 'https://example.test/door.mp3' })
    .select('id').single();
  expect(sfx.error).toBeNull();
  sfxId = sfx.data!.id;
});
afterAll(async () => {
  await adminClient().from('sfx_assets').delete().eq('id', sfxId);
  await destroyCast(cast);
});

const sees = async (client: ReturnType<typeof anonClient>) =>
  ((await client.from('sfx_assets').select('id').eq('id', sfxId)).data ?? []).length === 1;

describe('sound effects', () => {
  it('the uploader and the crew see a project\'s sounds; outsiders and signed-out visitors don\'t', async () => {
    expect(await sees(cast.sam.client)).toBe(true);
    expect(await sees(cast.jordan.client)).toBe(true);
    expect(await sees(cast.riley.client)).toBe(false);
    expect(await sees(anonClient())).toBe(false);
  });

  it('only the uploader renames or removes one', async () => {
    await cast.jordan.client.from('sfx_assets').update({ title: 'Hijacked' }).eq('id', sfxId);
    await cast.jordan.client.from('sfx_assets').delete().eq('id', sfxId);
    const row = (await adminClient().from('sfx_assets').select('title').eq('id', sfxId).single()).data;
    expect(row?.title).toBe('Door slam');
    expect((await cast.sam.client.from('sfx_assets').update({ title: 'Door slam (hard)' }).eq('id', sfxId)).error).toBeNull();
    expect((await adminClient().from('sfx_assets').select('title').eq('id', sfxId).single()).data?.title).toBe('Door slam (hard)');
  });
});

describe('portfolio (writes split from reads)', () => {
  it('everyone reads, only the owner writes — one set of owner rules for media', async () => {
    const project = await cast.sam.client.from('portfolio_projects')
      .insert({ user_id: cast.sam.id, title: 'Reel' } as never).select('id').single();
    expect(project.error).toBeNull();
    const pid = project.data!.id;
    expect(((await anonClient().from('portfolio_projects').select('id').eq('id', pid)).data ?? []).length).toBe(1);

    const byOther = await cast.riley.client.from('portfolio_projects').update({ title: 'Mine now' } as never).eq('id', pid).select('id');
    expect(byOther.data ?? []).toEqual([]);
    const intoOthers = await cast.riley.client.from('portfolio_media').insert({ project_id: pid, url: 'https://example.test/x.jpg' } as never);
    expect(intoOthers.error).not.toBeNull();
    expect((await cast.sam.client.from('portfolio_projects').delete().eq('id', pid)).error).toBeNull();
  });
});
