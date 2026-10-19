import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// What a client can write to a message, as personas (20261018000000_messages_integrity.sql).
// Sam runs a project channel; Jordan is crew and posts in it; Riley is outside.
// Pins, reactions, hidden and edited marks belong to their RPCs; a direct
// insert can't set them. A hidden message keeps its record. The legacy
// channel_id branch no longer makes a row readable by everyone.
let cast: Cast;
let projectId: string;
let channelId: string;
let otherChannelId: string;

type Client = Cast['sam']['client'];
const base = () => ({ sender_id: cast.jordan.id, channel_uuid: channelId, content: 'Lunch at one' });
const insert = (client: Client, row: Record<string, unknown>) =>
  client.from('messages').insert(row as never).select('id, pinned, reactions, created_at').single();
const say = async (client: Client, sender: string, content: string, parent?: string) =>
  (await client.from('messages').insert({ sender_id: sender, channel_uuid: channelId, content, parent_message_id: parent ?? null }).select('id').single()).data!.id as string;
const hide = async (id: string) => {
  const db = adminClient();
  const { data } = await db.from('messages').select('content').eq('id', id).single();
  await db.from('hidden_messages').insert({ message_id: id, original: data!.content, hidden_by: cast.sam.id });
  await db.from('messages').update({ content: '[Removed by an admin]', hidden_at: new Date().toISOString() }).eq('id', id);
};
const exists = async (id: string) => ((await adminClient().from('messages').select('id').eq('id', id)).data ?? []).length === 1;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Integrity'));
  const ids: string[] = [];
  for (const name of [`set-${Date.now()}`, `notes-${Date.now()}`]) {
    expect((await cast.sam.client.from('channels').insert({ project_id: projectId, name, created_by: cast.sam.id })).error).toBeNull();
    ids.push((await cast.sam.client.from('channels').select('id').eq('project_id', projectId).eq('name', name).single()).data!.id);
  }
  [channelId, otherChannelId] = ids;
});
afterAll(async () => { await destroyCast(cast); });

describe('a direct insert can’t set what the RPCs own', () => {
  it('a plain post still works, with no reactions and the server’s time', async () => {
    const r = await insert(cast.jordan.client, { ...base(), reactions: {}, created_at: '2020-01-01T00:00:00Z' });
    expect(r.error).toBeNull();
    expect(r.data).toMatchObject({ pinned: false, reactions: {} });
    expect(Date.now() - new Date(r.data!.created_at!).getTime()).toBeLessThan(60_000);
  });

  it('crew can’t pin their own message by inserting it pinned', async () => {
    const now = new Date().toISOString();
    expect((await insert(cast.jordan.client, { ...base(), pinned: true, pinned_at: now, pinned_by: cast.sam.id })).error).not.toBeNull();
    expect((await insert(cast.jordan.client, { ...base(), pinned_by: cast.jordan.id })).error).not.toBeNull();
    const pinned = (await cast.sam.client.from('messages').select('id').eq('channel_uuid', channelId).eq('pinned', true)).data ?? [];
    expect(pinned).toEqual([]);
  });

  it('nobody can post reactions in someone else’s name', async () => {
    expect((await insert(cast.jordan.client, { ...base(), reactions: { '👍': [cast.sam.id, cast.riley.id] } })).error).not.toBeNull();
    expect((await insert(cast.riley.client, { sender_id: cast.riley.id, receiver_id: cast.sam.id, content: 'hi', reactions: { '❤️': [cast.sam.id] } })).error).not.toBeNull();
  });

  it('a new message is neither edited, hidden nor on the legacy channel column', async () => {
    const now = new Date().toISOString();
    expect((await insert(cast.jordan.client, { ...base(), edited_at: now })).error).not.toBeNull();
    expect((await insert(cast.jordan.client, { ...base(), hidden_at: now })).error).not.toBeNull();
    expect((await insert(cast.jordan.client, { ...base(), channel_id: 'general' })).error).not.toBeNull();
    // A DM carrying channel_id used to be readable by every signed-in user.
    expect((await insert(cast.riley.client, { sender_id: cast.riley.id, receiver_id: cast.sam.id, content: 'hi', channel_id: 'general' })).error).not.toBeNull();
  });

  it('a reply goes under a top-level message in the same channel only', async () => {
    const parent = await say(cast.sam.client, cast.sam.id, 'Who has the van keys?');
    const reply = await insert(cast.jordan.client, { ...base(), parent_message_id: parent });
    expect(reply.error).toBeNull();
    // Not into another channel's thread, not under a reply, not under a DM.
    expect((await insert(cast.jordan.client, { ...base(), channel_uuid: otherChannelId, parent_message_id: parent })).error).not.toBeNull();
    expect((await insert(cast.jordan.client, { ...base(), parent_message_id: reply.data!.id })).error).not.toBeNull();
    const dm = (await cast.sam.client.from('messages').insert({ sender_id: cast.sam.id, receiver_id: cast.jordan.id, content: 'Keys are with me' }).select('id').single()).data!.id;
    expect((await insert(cast.jordan.client, { sender_id: cast.jordan.id, receiver_id: cast.sam.id, content: 'ok', parent_message_id: dm })).error).not.toBeNull();
    // Riley can't post here at all, threaded or not.
    expect((await insert(cast.riley.client, { sender_id: cast.riley.id, channel_uuid: channelId, content: 'hi', parent_message_id: parent })).error).not.toBeNull();
  });
});

describe('a hidden message keeps its record', () => {
  it('neither its sender nor the channel’s owner can delete it; the original stays', async () => {
    const id = await say(cast.jordan.client, cast.jordan.id, 'Wire me the deposit');
    await hide(id);
    await cast.jordan.client.from('messages').delete().eq('id', id);
    await cast.sam.client.from('messages').delete().eq('id', id);
    expect(await exists(id)).toBe(true);
    expect((await adminClient().from('hidden_messages').select('original').eq('message_id', id).single()).data?.original).toBe('Wire me the deposit');
  });

  it('a message with a hidden reply can’t be deleted (it would take the reply with it)', async () => {
    const parent = await say(cast.sam.client, cast.sam.id, 'Crew drinks Friday');
    const reply = await say(cast.jordan.client, cast.jordan.id, 'DM me for the good stuff', parent);
    await hide(reply);
    await cast.sam.client.from('messages').delete().eq('id', parent);
    expect(await exists(parent)).toBe(true);
    expect(await exists(reply)).toBe(true);
  });

  it('messages nobody hid can still be deleted by their sender and by the channel’s owner', async () => {
    const mine = await say(cast.jordan.client, cast.jordan.id, 'Typo');
    expect(((await cast.jordan.client.from('messages').delete().eq('id', mine).select('id')).data ?? [])).toHaveLength(1);
    const theirs = await say(cast.jordan.client, cast.jordan.id, 'Off topic');
    expect(((await cast.sam.client.from('messages').delete().eq('id', theirs).select('id')).data ?? [])).toHaveLength(1);
    const notYours = await say(cast.sam.client, cast.sam.id, 'Stays');
    await cast.riley.client.from('messages').delete().eq('id', notYours);
    await cast.jordan.client.from('messages').delete().eq('id', notYours);
    expect(await exists(notYours)).toBe(true);
  });
});

describe('reading', () => {
  it('a legacy row on channel_id is read by its sender only, not by every signed-in user', async () => {
    const legacy = (await adminClient().from('messages').insert({ sender_id: cast.sam.id, content: 'old channel text', channel_id: 'general' }).select('id').single()).data!.id;
    expect((await cast.sam.client.from('messages').select('id').eq('id', legacy)).data).toHaveLength(1);
    expect((await cast.riley.client.from('messages').select('id').eq('id', legacy)).data).toEqual([]);
    expect((await cast.jordan.client.from('messages').select('id').eq('id', legacy)).data).toEqual([]);
    await adminClient().from('messages').delete().eq('id', legacy);
  });
});

describe('reactions', () => {
  it('two people reacting at once both land', async () => {
    const id = await say(cast.sam.client, cast.sam.id, 'Picture wrap!');
    await Promise.all([
      cast.jordan.client.rpc('toggle_message_reaction', { p_message: id, p_emoji: '🎬' }),
      cast.sam.client.rpc('toggle_message_reaction', { p_message: id, p_emoji: '🎬' }),
    ]);
    const r = (await adminClient().from('messages').select('reactions').eq('id', id).single()).data!.reactions as Record<string, string[]>;
    expect([...r['🎬']].sort()).toEqual([cast.jordan.id, cast.sam.id].sort());
  });

  it('a message holds at most 20 different reactions; outsiders can’t react', async () => {
    const id = await say(cast.sam.client, cast.sam.id, 'Vote with emoji');
    for (let i = 0; i < 20; i++) {
      expect((await cast.jordan.client.rpc('toggle_message_reaction', { p_message: id, p_emoji: `r${i}` })).error).toBeNull();
    }
    expect((await cast.jordan.client.rpc('toggle_message_reaction', { p_message: id, p_emoji: 'r20' })).error).not.toBeNull();
    // An existing reaction can still be added to and taken back.
    expect((await cast.sam.client.rpc('toggle_message_reaction', { p_message: id, p_emoji: 'r0' })).error).toBeNull();
    expect((await cast.jordan.client.rpc('toggle_message_reaction', { p_message: id, p_emoji: 'r1' })).error).toBeNull();
    expect((await cast.riley.client.rpc('toggle_message_reaction', { p_message: id, p_emoji: 'r0' })).error).not.toBeNull();
  });
});
