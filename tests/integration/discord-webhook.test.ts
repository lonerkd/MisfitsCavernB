import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';

// has_discord_webhook answers only for whoever can manage the channel
// (migration 20261004010000) — before, any signed-in user could ask about
// any channel.
let cast: Cast;
let projectId: string;
let channelId: string;

beforeAll(async () => {
  cast = await createCast();
  projectId = (await cast.sam.client.from('projects').insert({ title: 'Wharf', creator_id: cast.sam.id }).select('id').single()).data!.id;
  expect((await cast.sam.client.from('project_crew').insert({ project_id: projectId, user_id: cast.jordan.id, craft: 'Editor', status: 'confirmed' })).error).toBeNull();
  const name = `announcements-${Date.now().toString(36)}`;
  expect((await cast.sam.client.from('channels').insert({ project_id: projectId, name, created_by: cast.sam.id })).error).toBeNull();
  channelId = (await cast.sam.client.from('channels').select('id').eq('project_id', projectId).eq('name', name).single()).data!.id;
  expect((await cast.sam.client.from('discord_integrations')
    .insert({ channel_id: channelId, webhook_url: 'https://discord.example.test/api/webhooks/1/x', created_by: cast.sam.id })).error).toBeNull();
});
afterAll(async () => {
  await cast.sam.client.from('projects').delete().eq('id', projectId);
  await destroyCast(cast);
});

const asks = async (who: keyof Pick<Cast, 'sam' | 'jordan' | 'riley'>) => {
  const { data, error } = await cast[who].client.rpc('has_discord_webhook', { cid: channelId });
  expect(error).toBeNull();
  return data;
};

describe('has_discord_webhook', () => {
  it('tells the channel\'s manager it has a webhook', async () => {
    expect(await asks('sam')).toBe(true);
  });

  it('answers false to crew who can\'t manage it, and to outsiders', async () => {
    expect(await asks('jordan')).toBe(false);
    expect(await asks('riley')).toBe(false);
  });
});
