import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createFakeSupabase, type FakeResults } from '@/tests/unit-support/fakeSupabase';
import type { Database } from './database.types';
import { canSeeChannel, getChannelWebhookUrl, getUsername } from './discord';

const fake = (r: FakeResults) => {
  const f = createFakeSupabase(r);
  return { f, db: f.client as unknown as SupabaseClient<Database> };
};
const boom = { message: 'nope' };

describe('canSeeChannel', () => {
  it('is true when the user can read the row', async () => {
    const { db, f } = fake({ channels: { data: { id: 'c1' } } });
    expect(await canSeeChannel(db, 'c1')).toBe(true);
    expect(f.argsOf('channels', 'eq')).toEqual([['id', 'c1']]);
  });
  it('is false when RLS hides it', async () => {
    expect(await canSeeChannel(fake({ channels: { data: null } }).db, 'c1')).toBe(false);
  });
  it('is false on an error, even with data', async () => {
    expect(await canSeeChannel(fake({ channels: { data: { id: 'c1' }, error: boom } }).db, 'c1')).toBe(false);
  });
});

describe('getChannelWebhookUrl', () => {
  it('returns the stored URL', async () => {
    const { db, f } = fake({ discord_integrations: { data: { webhook_url: 'https://discord.com/api/webhooks/1/x' } } });
    expect(await getChannelWebhookUrl(db, 'c1')).toBe('https://discord.com/api/webhooks/1/x');
    expect(f.argsOf('discord_integrations', 'eq')).toEqual([['channel_id', 'c1']]);
  });
  it('is null when none is set or the read fails', async () => {
    expect(await getChannelWebhookUrl(fake({ discord_integrations: { data: null } }).db, 'c1')).toBeNull();
    expect(await getChannelWebhookUrl(fake({ discord_integrations: { data: { webhook_url: 'u' }, error: boom } }).db, 'c1')).toBeNull();
  });
});

describe('getUsername', () => {
  it('returns the username, or null', async () => {
    expect(await getUsername(fake({ profiles: { data: { username: 'sam' } } }).db, 'u1')).toBe('sam');
    expect(await getUsername(fake({ profiles: { data: null } }).db, 'u1')).toBeNull();
  });
});
