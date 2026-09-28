import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Lounge channels as personas. Community: admins create and run them;
// everyone signed in sees "users" channels, admins-only ones stay with admins,
// guides are read-only, private community channels are members-only. Project:
// each audience (team, owners, above/below the line, guests, public) reaches
// exactly its people.
let cast: Cast;
let projectId: string;
const made: string[] = [];

type Client = Cast['sam']['client'];
const create = async (client: Client, row: Record<string, unknown>) => {
  const name = `${row.name}-${Date.now()}-${made.length}`;
  const { error } = await client.from('channels').insert({ ...row, name });
  if (error) return { error };
  // Read back (a new row isn't visible to the visibility check inside its own insert).
  const q = client.from('channels').select('id').eq('name', name);
  const { data } = await (row.project_id ? q.eq('project_id', row.project_id as string) : q.is('project_id', null)).single();
  made.push(data!.id);
  return { id: data!.id as string, error: null };
};
const sees = async (client: Client, id: string) => ((await client.from('channels').select('id').eq('id', id)).data ?? []).length === 1;
const post = async (client: Client, sender: string, id: string) => (await client.from('messages').insert({ sender_id: sender, channel_uuid: id, content: 'hi' })).error === null;

beforeAll(async () => {
  cast = await createCast();
  expect((await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id)).error).toBeNull();
  ({ projectId } = await createCrewedProject(cast, 'Audiences')); // Jordan: contributor, Production designer (below the line)
});

afterAll(async () => {
  if (made.length) await adminClient().from('channels').delete().in('id', made);
  await adminClient().from('profiles').update({ is_admin: false }).eq('id', cast.sam.id);
  await destroyCast(cast);
});

describe('community channels', () => {
  it('starter channels: guides first, announcements for managers, an admins room only admins see', async () => {
    const { data } = await cast.sam.client.from('channels').select('name, type, audience, post_policy').is('project_id', null);
    const by = new Map((data ?? []).map((c) => [c.name, c]));
    for (const n of ['start-here', 'faq', 'tutorials']) expect(by.get(n)).toMatchObject({ type: 'guide' });
    expect(by.get('announcements')).toMatchObject({ post_policy: 'managers' });
    expect(by.get('admins')).toMatchObject({ audience: 'admins' });
    const jordanSees = new Set(((await cast.jordan.client.from('channels').select('name').is('project_id', null)).data ?? []).map((c) => c.name));
    expect(jordanSees.has('general')).toBe(true);
    expect(jordanSees.has('admins')).toBe(false);
  });

  it('only admins create community channels; guides are read-only for everyone else', async () => {
    expect((await create(cast.riley.client, { name: 'nope', created_by: cast.riley.id })).error).not.toBeNull();
    const guide = await create(cast.sam.client, { name: 'how-to', type: 'guide', created_by: cast.sam.id });
    expect(guide.error).toBeNull();
    expect(await post(cast.riley.client, cast.riley.id, guide.id!)).toBe(false);
    expect(await post(cast.sam.client, cast.sam.id, guide.id!)).toBe(true);
  });

  it('a private community channel is members-only (it used to be open to everyone)', async () => {
    const secret = await create(cast.sam.client, { name: 'mods', is_private: true, created_by: cast.sam.id });
    expect(await sees(cast.riley.client, secret.id!)).toBe(false);
    expect(await post(cast.riley.client, cast.riley.id, secret.id!)).toBe(false);
    expect((await cast.sam.client.from('channel_members').insert({ channel_id: secret.id!, user_id: cast.jordan.id, can_post: true })).error).toBeNull();
    expect(await sees(cast.jordan.client, secret.id!)).toBe(true);
  });

  it('messages come down by their author or whoever runs the channel — nobody else', async () => {
    const ch = await create(cast.sam.client, { name: 'moderated', created_by: cast.sam.id });
    const say = async (client: Client, sender: string) => {
      const content = `m-${Math.random()}`;
      expect((await client.from('messages').insert({ sender_id: sender, channel_uuid: ch.id!, content })).error).toBeNull();
      return (await adminClient().from('messages').select('id').eq('content', content).single()).data!.id as string;
    };
    const gone = async (client: Client, id: string) => ((await client.from('messages').delete().eq('id', id).select('id')).data ?? []).length === 1;
    const jordans = await say(cast.jordan.client, cast.jordan.id);
    expect(await gone(cast.riley.client, jordans)).toBe(false); // not theirs, not their channel
    expect(await gone(cast.sam.client, jordans)).toBe(true); // the admin moderates
    const rileys = await say(cast.riley.client, cast.riley.id);
    expect(await gone(cast.riley.client, rileys)).toBe(true); // their own
  });

  it('others can’t change or delete community channels', async () => {
    const ch = await create(cast.sam.client, { name: 'screenwriting', created_by: cast.sam.id });
    expect((await cast.riley.client.from('channels').update({ topic: 'x' }).eq('id', ch.id!).select('id')).data ?? []).toEqual([]);
    expect((await cast.riley.client.from('channels').delete().eq('id', ch.id!).select('id')).data ?? []).toEqual([]);
  });
});

describe('project channel audiences', () => {
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    for (const audience of ['team', 'owners', 'above', 'below', 'guests', 'public']) {
      ids[audience] = (await create(cast.sam.client, { name: audience, project_id: projectId, audience, created_by: cast.sam.id })).id!;
    }
  });

  it('the owner sees every audience', async () => {
    for (const id of Object.values(ids)) expect(await sees(cast.sam.client, id)).toBe(true);
  });

  it('a below-the-line contributor sees team, below and public — not owners, above or guests', async () => {
    const seen = Object.fromEntries(await Promise.all(Object.entries(ids).map(async ([a, id]) => [a, await sees(cast.jordan.client, id)])));
    expect(seen).toEqual({ team: true, owners: false, above: false, below: true, guests: false, public: true });
  });

  it('crafts decide the line; the viewer role makes a guest', async () => {
    await cast.sam.client.from('project_crew').update({ craft: 'Director' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect(await sees(cast.jordan.client, ids.above)).toBe(true);
    expect(await sees(cast.jordan.client, ids.below)).toBe(false);
    await cast.sam.client.from('project_crew').update({ role: 'viewer' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect(await sees(cast.jordan.client, ids.guests)).toBe(true);
    await cast.sam.client.from('project_crew').update({ role: 'lead' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect(await sees(cast.jordan.client, ids.owners)).toBe(true);
  });

  it('an outsider reads only the public channel', async () => {
    const seen = Object.fromEntries(await Promise.all(Object.entries(ids).map(async ([a, id]) => [a, await sees(cast.riley.client, id)])));
    expect(seen).toEqual({ team: false, owners: false, above: false, below: false, guests: false, public: true });
  });

  it('a private project’s public channel stays private', async () => {
    const vis = (await adminClient().from('projects').select('visibility').eq('id', projectId).single()).data!.visibility;
    expect((await adminClient().from('projects').update({ visibility: 'private' }).eq('id', projectId)).error).toBeNull();
    try {
      expect(await sees(cast.riley.client, ids.public)).toBe(false);
      expect(await sees(cast.sam.client, ids.public)).toBe(true);
    } finally {
      await adminClient().from('projects').update({ visibility: vis }).eq('id', projectId);
    }
  });

  it('a project audience must be a project one', async () => {
    expect((await create(cast.sam.client, { name: 'bad', project_id: projectId, audience: 'admins', created_by: cast.sam.id })).error).not.toBeNull();
    expect((await create(cast.sam.client, { name: 'bad2', audience: 'owners', created_by: cast.sam.id })).error).not.toBeNull();
  });
});
