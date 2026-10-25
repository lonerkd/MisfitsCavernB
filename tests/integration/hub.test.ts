import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';

// The hub (hub_posts, hub_reads): everyone signed in reads published posts;
// drafts and every write are for admins; each person's reads are their own;
// an important post that goes out notifies every account.
let cast: Cast;
const created: string[] = [];

beforeAll(async () => {
  cast = await createCast();
  await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id);
});

afterAll(async () => {
  if (created.length) await adminClient().from('hub_posts').delete().in('id', created);
  await adminClient().from('profiles').update({ is_admin: false }).eq('id', cast.sam.id);
  await destroyCast(cast);
});

async function post(fields: Record<string, unknown>) {
  const { data, error } = await cast.sam.client.from('hub_posts').insert({ title: 'Post', body: 'Body', ...fields }).select('id').single();
  expect(error).toBeNull();
  created.push(data!.id);
  return data!.id as string;
}

describe('reading', () => {
  it('members read published posts, never drafts', async () => {
    const published = await post({ title: 'Published update', published_at: new Date().toISOString() });
    const draft = await post({ title: 'Draft update' });
    for (const who of [cast.jordan, cast.riley]) {
      const { data, error } = await who.client.from('hub_posts').select('id').in('id', [published, draft]);
      expect(error).toBeNull();
      expect(data!.map((r) => r.id)).toEqual([published]);
    }
  });

  it('a post scheduled for later is not visible yet', async () => {
    const later = await post({ title: 'Later', published_at: new Date(Date.now() + 86_400_000).toISOString() });
    const { data } = await cast.jordan.client.from('hub_posts').select('id').eq('id', later);
    expect(data).toEqual([]);
  });

  it('admins read drafts', async () => {
    const draft = await post({ title: 'Admin-only draft' });
    const { data } = await cast.sam.client.from('hub_posts').select('id').eq('id', draft);
    expect(data).toEqual([{ id: draft }]);
  });

  it('anon reads nothing', async () => {
    const { data } = await anonClient().from('hub_posts').select('id');
    expect(data ?? []).toEqual([]);
  });
});

describe('writing', () => {
  it('only admins write posts', async () => {
    const id = await post({ title: 'Target', published_at: new Date().toISOString() });
    for (const who of [cast.jordan, cast.riley]) {
      expect((await who.client.from('hub_posts').insert({ title: 'Mine' })).error).not.toBeNull();
      await who.client.from('hub_posts').update({ title: 'Hijacked' }).eq('id', id);
      await who.client.from('hub_posts').delete().eq('id', id);
    }
    const { data } = await adminClient().from('hub_posts').select('title').eq('id', id).single();
    expect(data?.title).toBe('Target');
  });

  it('the author stays the author', async () => {
    const id = await post({ title: 'Authored' });
    await cast.sam.client.from('hub_posts').update({ created_by: cast.jordan.id }).eq('id', id);
    const { data } = await adminClient().from('hub_posts').select('created_by').eq('id', id).single();
    expect(data?.created_by).toBe(cast.sam.id);
  });
});

describe('reads', () => {
  it('each person sees and writes only their own', async () => {
    const id = await post({ title: 'Read me', published_at: new Date().toISOString() });
    expect((await cast.jordan.client.from('hub_reads').insert({ post_id: id })).error).toBeNull();
    expect((await cast.riley.client.from('hub_reads').insert({ post_id: id, user_id: cast.jordan.id })).error).not.toBeNull();
    const riley = await cast.riley.client.from('hub_reads').select('user_id').eq('post_id', id);
    expect(riley.data).toEqual([]);
    const jordan = await cast.jordan.client.from('hub_reads').select('user_id').eq('post_id', id);
    expect(jordan.data).toEqual([{ user_id: cast.jordan.id }]);
  });
});

describe('announcing', () => {
  it('publishing an important post notifies every account, once', async () => {
    const id = await post({ title: 'Big news', important: true });
    const count = async () =>
      (await adminClient().from('notifications').select('user_id').eq('link', `/hub/${id}`)).data!.map((n) => n.user_id);
    expect(await count()).toEqual([]);

    expect((await cast.sam.client.from('hub_posts').update({ published_at: new Date().toISOString() }).eq('id', id)).error).toBeNull();
    const after = await count();
    expect(after).toEqual(expect.arrayContaining([cast.sam.id, cast.jordan.id, cast.riley.id]));

    await cast.sam.client.from('hub_posts').update({ title: 'Big news, edited' }).eq('id', id);
    expect((await count()).length).toBe(after.length);
  });

  it('an important post scheduled for later notifies nobody yet', async () => {
    const id = await post({ title: 'Coming soon', important: true, published_at: new Date(Date.now() + 86_400_000).toISOString() });
    const { data } = await adminClient().from('notifications').select('id').eq('link', `/hub/${id}`);
    expect(data).toEqual([]);
  });

  it('a post that is not important notifies nobody', async () => {
    const id = await post({ title: 'Small news', published_at: new Date().toISOString() });
    const { data } = await adminClient().from('notifications').select('id').eq('link', `/hub/${id}`);
    expect(data).toEqual([]);
  });

  it('each person reads only their own hub notification', async () => {
    const id = await post({ title: 'Private bell', important: true, published_at: new Date().toISOString() });
    const { data } = await cast.riley.client.from('notifications').select('user_id').eq('link', `/hub/${id}`);
    expect(data).toEqual([{ user_id: cast.riley.id }]);
  });
});
