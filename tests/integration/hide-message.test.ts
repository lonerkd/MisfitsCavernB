import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, adminClient, anonClient, type Cast } from './support/personas';

// Acting on a report about a message: a platform admin can hide it (everyone
// then reads a notice, never the words), read what was reported, and bring it
// back. The sender cannot undo it. As personas: Sam is the platform admin,
// Jordan wrote the message, Riley is a member who reported it.
const NOTICE = '[Removed by an admin]';
let cast: Cast;
let channelId = '';
let messageId = '';
let otherMessageId = '';
let reportId = '';

beforeAll(async () => {
  cast = await createCast();
  const db = adminClient();
  await db.from('profiles').update({ is_admin: true }).eq('id', cast.sam.id);
  const ch = await db.from('channels').insert({ name: `hide-${Date.now()}`, project_id: null, type: 'text', audience: 'users', post_policy: 'viewers', created_by: cast.sam.id }).select('id').single();
  if (ch.error) throw ch.error;
  channelId = ch.data.id;
  const a = await db.from('messages').insert({ sender_id: cast.jordan.id, channel_uuid: channelId, content: 'Send me money first' }).select('id').single();
  const b = await db.from('messages').insert({ sender_id: cast.jordan.id, channel_uuid: channelId, content: 'A harmless note' }).select('id').single();
  if (a.error || b.error) throw a.error ?? b.error;
  messageId = a.data.id;
  otherMessageId = b.data.id;
  const rep = await cast.riley.client.from('reports').insert({ kind: 'message', target_id: messageId, reason: 'Scam' }).select('id').single();
  if (rep.error) throw rep.error;
  reportId = rep.data.id;
});
afterAll(async () => {
  const db = adminClient();
  await db.from('audit_logs').delete().in('resource_id', [messageId, otherMessageId]);
  await db.from('reports').delete().eq('id', reportId);
  await db.from('channels').delete().eq('id', channelId);
  await db.from('profiles').update({ is_admin: false }).eq('id', cast.sam.id);
  await destroyCast(cast);
});

const readAs = async (who: 'jordan' | 'riley') => (await cast[who].client.from('messages').select('content, hidden_at').eq('id', messageId).single()).data;

describe('reading a reported message', () => {
  it('only an admin can read what was reported, and only if it was reported', async () => {
    const ok = await cast.sam.client.rpc('admin_reported_message', { p_report: reportId });
    expect(ok.error).toBeNull();
    expect(ok.data?.[0]).toMatchObject({ content: 'Send me money first', sender_id: cast.jordan.id, hidden: false });
    expect((await cast.riley.client.rpc('admin_reported_message', { p_report: reportId })).error).not.toBeNull();
    expect((await cast.jordan.client.rpc('admin_reported_message', { p_report: reportId })).error).not.toBeNull();
    expect((await anonClient().rpc('admin_reported_message', { p_report: reportId })).error).not.toBeNull();
  });
});

describe('hiding', () => {
  it('nobody but an admin can hide a message', async () => {
    for (const who of ['jordan', 'riley'] as const) {
      expect((await cast[who].client.rpc('admin_hide_message', { p_message: messageId, p_hidden: true })).error).not.toBeNull();
    }
    expect((await anonClient().rpc('admin_hide_message', { p_message: messageId, p_hidden: true })).error).not.toBeNull();
    expect((await readAs('riley'))?.content).toBe('Send me money first');
  });

  it('an admin hides it: everyone reads the notice, never the words, and it is on the record', async () => {
    const { error } = await cast.sam.client.rpc('admin_hide_message', { p_message: messageId, p_hidden: true });
    expect(error).toBeNull();
    for (const who of ['jordan', 'riley'] as const) {
      const m = await readAs(who);
      expect(m?.content).toBe(NOTICE);
      expect(m?.hidden_at).not.toBeNull();
    }
    const log = (await adminClient().from('audit_logs').select('user_id, action, resource_type').eq('resource_id', messageId)).data ?? [];
    expect(log).toEqual([{ user_id: cast.sam.id, action: 'admin_hide_message', resource_type: 'message' }]);
  });

  it('the original is kept for admins only', async () => {
    expect((await cast.sam.client.from('hidden_messages').select('original').eq('message_id', messageId).single()).data?.original).toBe('Send me money first');
    for (const who of ['jordan', 'riley'] as const) {
      expect((await cast[who].client.from('hidden_messages').select('original').eq('message_id', messageId)).data ?? []).toEqual([]);
    }
    expect((await anonClient().from('hidden_messages').select('original').eq('message_id', messageId)).data ?? []).toEqual([]);
  });

  it('the sender cannot edit it back', async () => {
    const { error } = await cast.jordan.client.rpc('edit_message', { p_message: messageId, p_content: 'Nothing to see' });
    expect(error).not.toBeNull();
    expect((await readAs('jordan'))?.content).toBe(NOTICE);
  });

  it('an admin brings it back', async () => {
    expect((await cast.sam.client.rpc('admin_hide_message', { p_message: messageId, p_hidden: false })).error).toBeNull();
    const m = await readAs('riley');
    expect(m).toEqual({ content: 'Send me money first', hidden_at: null });
    expect((await adminClient().from('hidden_messages').select('message_id').eq('message_id', messageId)).data).toEqual([]);
  });

  it('a message that does not exist is a plain error, and another message is untouched', async () => {
    expect((await cast.sam.client.rpc('admin_hide_message', { p_message: '00000000-0000-0000-0000-000000000000', p_hidden: true })).error).not.toBeNull();
    expect((await cast.riley.client.from('messages').select('content').eq('id', otherMessageId).single()).data?.content).toBe('A harmless note');
  });

  it('deleting a hidden message takes its kept original with it', async () => {
    await cast.sam.client.rpc('admin_hide_message', { p_message: otherMessageId, p_hidden: true });
    expect((await adminClient().from('hidden_messages').select('message_id').eq('message_id', otherMessageId)).data).toHaveLength(1);
    expect((await cast.jordan.client.from('messages').delete().eq('id', otherMessageId)).error).toBeNull();
    expect((await adminClient().from('hidden_messages').select('message_id').eq('message_id', otherMessageId)).data).toEqual([]);
  });
});
