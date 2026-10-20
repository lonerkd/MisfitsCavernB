import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { discordNotifyBodySchema, discordTestBodySchema, parseJsonBody } from '@/lib/validation';

// Validation is not the gatekeeper: a body that parseJsonBody accepts can still
// be refused by Row Level Security, and the refusal must come back as a
// returned error (never a throw, never a row) for the caller to report.
let cast: Cast;
let projectId: string;
let channelId: string;

const jsonRequest = (body: unknown) => new Request('http://localhost/api/test', { method: 'POST', body: JSON.stringify(body) });

beforeAll(async () => {
  cast = await createCast();
  projectId = (await cast.sam.client.from('projects').insert({ title: 'Validation wharf', creator_id: cast.sam.id }).select('id').single()).data!.id;
  const name = `announcements-${Date.now().toString(36)}`;
  expect((await cast.sam.client.from('channels').insert({ project_id: projectId, name, created_by: cast.sam.id })).error).toBeNull();
  channelId = (await cast.sam.client.from('channels').select('id').eq('project_id', projectId).eq('name', name).single()).data!.id;
});
afterAll(async () => {
  await cast.sam.client.from('projects').delete().eq('id', projectId);
  await destroyCast(cast);
});

describe('parseJsonBody accepts, RLS refuses', () => {
  it('a valid notify body passes validation for everyone', async () => {
    const parsed = await parseJsonBody(jsonRequest({ channelId, content: 'Call time moved to 6am' }), discordNotifyBodySchema);
    expect(parsed.ok).toBe(true);
  });

  it('an outsider cannot post a validated message into the channel', async () => {
    const parsed = await parseJsonBody(jsonRequest({ channelId, content: 'Let me in' }), discordNotifyBodySchema);
    if (!parsed.ok) throw new Error(parsed.error);
    const res = await cast.riley.client
      .from('messages')
      .insert({ sender_id: cast.riley.id, channel_uuid: parsed.data.channelId, content: parsed.data.content })
      .select('id');
    expect(res.error).not.toBeNull();
    expect(res.data).toBeNull();
    const rows = await cast.sam.client.from('messages').select('id').eq('channel_uuid', channelId);
    expect(rows.data).toEqual([]);
  });

  it('an outsider cannot read the channel, so the notify route would answer 403', async () => {
    const res = await cast.riley.client.from('channels').select('id').eq('id', channelId).maybeSingle();
    expect(res.error).toBeNull();
    expect(res.data).toBeNull();
  });

  it('a signed-in user cannot spoof another sender with a valid body', async () => {
    const parsed = await parseJsonBody(jsonRequest({ channelId, content: 'Sam says hi' }), discordNotifyBodySchema);
    if (!parsed.ok) throw new Error(parsed.error);
    const res = await cast.jordan.client
      .from('messages')
      .insert({ sender_id: cast.sam.id, channel_uuid: parsed.data.channelId, content: parsed.data.content });
    expect(res.error).not.toBeNull();
  });

  it('a valid webhook URL cannot be stored by a non-manager', async () => {
    const parsed = await parseJsonBody(jsonRequest({ webhookUrl: 'https://discord.com/api/webhooks/123/abc-def' }), discordTestBodySchema);
    if (!parsed.ok) throw new Error(parsed.error);
    for (const who of [cast.riley, cast.jordan]) {
      const res = await who.client
        .from('discord_integrations')
        .insert({ channel_id: channelId, webhook_url: parsed.data.webhookUrl, created_by: who.id });
      expect(res.error).not.toBeNull();
    }
    const stored = await cast.sam.client.from('discord_integrations').select('channel_id').eq('channel_id', channelId);
    expect(stored.data).toEqual([]);
  });

  it('a signed-out visitor is refused too', async () => {
    const parsed = await parseJsonBody(jsonRequest({ channelId, content: 'Anyone there?' }), discordNotifyBodySchema);
    if (!parsed.ok) throw new Error(parsed.error);
    const res = await anonClient()
      .from('messages')
      .insert({ sender_id: cast.riley.id, channel_uuid: parsed.data.channelId, content: parsed.data.content });
    expect(res.error).not.toBeNull();
  });

  it('the owner can do the same thing, so the refusals above are RLS and not the body', async () => {
    const parsed = await parseJsonBody(jsonRequest({ channelId, content: 'Welcome' }), discordNotifyBodySchema);
    if (!parsed.ok) throw new Error(parsed.error);
    const res = await cast.sam.client
      .from('messages')
      .insert({ sender_id: cast.sam.id, channel_uuid: parsed.data.channelId, content: parsed.data.content });
    expect(res.error).toBeNull();
  });
});
