import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// The Lounge as personas: Sam runs a project channel Jordan (crew) posts in;
// Riley is outside it. Editing is the sender's own; pinning is whoever runs
// the channel; unread counts are per person and clear when read; search only
// finds what the searcher may read.
let cast: Cast;
let projectId: string;
let channelId: string;

type Client = Cast['sam']['client'];
const say = async (client: Client, sender: string, content: string) =>
  (await client.from('messages').insert({ sender_id: sender, channel_uuid: channelId, content }).select('id').single()).data!.id as string;
const unreadFor = async (client: Client, id: string) =>
  ((await client.rpc('lounge_unread')).data ?? []).find((r) => r.channel_id === id)?.unread ?? 0;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Lounge'));
  const name = `set-${Date.now()}`;
  expect((await cast.sam.client.from('channels').insert({ project_id: projectId, name, created_by: cast.sam.id })).error).toBeNull();
  channelId = (await cast.sam.client.from('channels').select('id').eq('project_id', projectId).eq('name', name).single()).data!.id;
});
afterAll(async () => { await destroyCast(cast); });

describe('editing', () => {
  it('your own message, marked edited — nobody else’s', async () => {
    const id = await say(cast.jordan.client, cast.jordan.id, 'Call is at 7');
    const edited = await cast.jordan.client.rpc('edit_message', { p_message: id, p_content: '  Call is at 6:30  ' });
    expect(edited.error).toBeNull();
    expect(edited.data).toMatchObject({ content: 'Call is at 6:30' });
    expect(edited.data!.edited_at).not.toBeNull();

    // Not Sam's to reword, even though Sam runs the channel; not Riley's either.
    expect((await cast.sam.client.rpc('edit_message', { p_message: id, p_content: 'Hijacked' })).error).not.toBeNull();
    expect((await cast.riley.client.rpc('edit_message', { p_message: id, p_content: 'Hijacked' })).error).not.toBeNull();
    expect((await cast.jordan.client.rpc('edit_message', { p_message: id, p_content: '   ' })).error).not.toBeNull();
    // Still no direct UPDATE path to a message.
    await cast.jordan.client.from('messages').update({ content: 'Sneaky', reactions: { '🔥': [cast.riley.id] } }).eq('id', id);
    expect((await adminClient().from('messages').select('content').eq('id', id).single()).data!.content).toBe('Call is at 6:30');
  });
});

describe('pinning', () => {
  it('whoever runs the channel pins; crew and outsiders can’t', async () => {
    const id = await say(cast.jordan.client, cast.jordan.id, 'Parking is behind the diner');
    expect((await cast.jordan.client.rpc('pin_message', { p_message: id, p_pinned: true })).error).not.toBeNull();
    expect((await cast.riley.client.rpc('pin_message', { p_message: id, p_pinned: true })).error).not.toBeNull();

    const pinned = await cast.sam.client.rpc('pin_message', { p_message: id, p_pinned: true });
    expect(pinned.data).toMatchObject({ pinned: true, pinned_by: cast.sam.id });
    const list = (await cast.jordan.client.from('messages').select('id').eq('channel_uuid', channelId).eq('pinned', true)).data ?? [];
    expect(list.map((m) => m.id)).toContain(id);

    const unpinned = await cast.sam.client.rpc('pin_message', { p_message: id, p_pinned: false });
    expect(unpinned.data).toMatchObject({ pinned: false, pinned_at: null, pinned_by: null });
  });

  it('either side of a direct conversation can pin it', async () => {
    const dm = (await cast.sam.client.from('messages').insert({ sender_id: cast.sam.id, receiver_id: cast.jordan.id, content: 'Your deal memo is in' }).select('id').single()).data!.id;
    expect((await cast.jordan.client.rpc('pin_message', { p_message: dm, p_pinned: true })).error).toBeNull();
    expect((await cast.riley.client.rpc('pin_message', { p_message: dm, p_pinned: false })).error).not.toBeNull();
  });
});

describe('unread', () => {
  it('counts what others posted since you last read, and clears when you read', async () => {
    await cast.sam.client.rpc('mark_lounge_read', { p_channel: channelId });
    await cast.jordan.client.rpc('mark_lounge_read', { p_channel: channelId });
    await say(cast.sam.client, cast.sam.id, 'Wrap at 6');
    await say(cast.sam.client, cast.sam.id, 'Thanks all');

    expect(await unreadFor(cast.jordan.client, channelId)).toBe(2);
    expect(await unreadFor(cast.sam.client, channelId)).toBe(0); // your own don't count
    expect(await unreadFor(cast.riley.client, channelId)).toBe(0); // can't see it at all
    expect((await cast.riley.client.rpc('mark_lounge_read', { p_channel: channelId })).error).not.toBeNull();

    await cast.jordan.client.rpc('mark_lounge_read', { p_channel: channelId });
    expect(await unreadFor(cast.jordan.client, channelId)).toBe(0);
    // Reads are private.
    expect((await cast.riley.client.from('lounge_reads').select('id').eq('user_id', cast.jordan.id)).data).toEqual([]);
  });

  it('direct messages count per person', async () => {
    await cast.riley.client.rpc('mark_lounge_read', { p_partner: cast.jordan.id });
    await cast.jordan.client.from('messages').insert({ sender_id: cast.jordan.id, receiver_id: cast.riley.id, content: 'Saw your reel' });
    const rows = (await cast.riley.client.rpc('lounge_unread')).data ?? [];
    expect(rows.find((r) => r.partner_id === cast.jordan.id)?.unread).toBe(1);
    await cast.riley.client.rpc('mark_lounge_read', { p_partner: cast.jordan.id });
    expect(((await cast.riley.client.rpc('lounge_unread')).data ?? []).find((r) => r.partner_id === cast.jordan.id)).toBeUndefined();
  });
});

describe('search', () => {
  it('finds words and word starts, only where you can read', async () => {
    await say(cast.sam.client, cast.sam.id, 'The generator arrives Thursday');
    const hits = (await cast.jordan.client.rpc('search_lounge', { p_query: 'generat thurs' })).data ?? [];
    expect(hits.map((h) => h.content)).toContain('The generator arrives Thursday');
    expect(hits.find((h) => h.content === 'The generator arrives Thursday')).toMatchObject({ channel_uuid: channelId, project_id: projectId });

    expect((await cast.jordan.client.rpc('search_lounge', { p_query: 'generator', p_channel: channelId })).data).toHaveLength(1);
    expect((await cast.riley.client.rpc('search_lounge', { p_query: 'generator' })).data).toEqual([]);
    expect((await cast.jordan.client.rpc('search_lounge', { p_query: '  !!  ' })).data).toEqual([]);
  });
});
