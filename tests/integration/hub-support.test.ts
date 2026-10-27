import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';

// Help (support_cases, support_case_messages): a person opens a case and only
// they and admins read it; only admins change its status; an admin's answer
// moves it to 'waiting' and notifies the opener; the opener's reply moves it
// back to 'open' and notifies the admins. Sam is the admin here.
let cast: Cast;
const created: string[] = [];

beforeAll(async () => {
  cast = await createCast();
  await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id);
});

afterAll(async () => {
  if (created.length) {
    await adminClient().from('notifications').delete().or(created.map((id) => `link.eq./hub/help/${id},link.eq./admin/support?case=${id}`).join(','));
    await adminClient().from('support_cases').delete().in('id', created);
  }
  await adminClient().from('profiles').update({ is_admin: false }).eq('id', cast.sam.id);
  await destroyCast(cast);
});

async function open(who: Cast['jordan'], subject = 'Export hangs') {
  const { data, error } = await who.client.from('support_cases').insert({ subject, page: '/studio' }).select('id').single();
  expect(error).toBeNull();
  created.push(data!.id);
  const msg = await who.client.from('support_case_messages').insert({ case_id: data!.id, body: 'It hangs at 90%.' });
  expect(msg.error).toBeNull();
  return data!.id as string;
}

const status = async (id: string) =>
  (await adminClient().from('support_cases').select('status').eq('id', id).single()).data?.status;
const notified = async (link: string) =>
  ((await adminClient().from('notifications').select('user_id').eq('link', link)).data ?? []).map((n) => n.user_id);

describe('reading', () => {
  it('the opener and admins read a case and its messages; Riley reads neither', async () => {
    const id = await open(cast.jordan);
    for (const who of [cast.jordan, cast.sam]) {
      expect((await who.client.from('support_cases').select('id').eq('id', id)).data).toEqual([{ id }]);
      expect((await who.client.from('support_case_messages').select('body').eq('case_id', id)).data).toHaveLength(1);
    }
    expect((await cast.riley.client.from('support_cases').select('id').eq('id', id)).data).toEqual([]);
    expect((await cast.riley.client.from('support_case_messages').select('id').eq('case_id', id)).data).toEqual([]);
  });

  it('anon reads nothing', async () => {
    const { data } = await anonClient().from('support_cases').select('id');
    expect(data ?? []).toEqual([]);
  });
});

describe('writing', () => {
  it('Riley cannot post into someone else\'s case, nor open one for them', async () => {
    const id = await open(cast.jordan);
    expect((await cast.riley.client.from('support_case_messages').insert({ case_id: id, body: 'hi' })).error).not.toBeNull();
    expect((await cast.riley.client.from('support_cases').insert({ subject: 'x', opened_by: cast.jordan.id })).error).not.toBeNull();
  });

  it('the opener cannot change the status, mark a message as an admin\'s, or open a case pre-resolved', async () => {
    const id = await open(cast.jordan);
    await cast.jordan.client.from('support_cases').update({ status: 'resolved' }).eq('id', id);
    expect(await status(id)).toBe('open');
    await cast.jordan.client.from('support_case_messages').insert({ case_id: id, body: 'me', from_admin: true });
    const { data } = await adminClient().from('support_case_messages').select('from_admin').eq('case_id', id);
    expect(data!.every((m) => !m.from_admin)).toBe(true);
    expect((await cast.jordan.client.from('support_cases').insert({ subject: 'x', status: 'resolved' })).error).not.toBeNull();
  });

  it('an admin changes the status; the subject stays', async () => {
    const id = await open(cast.jordan);
    expect((await cast.sam.client.from('support_cases').update({ status: 'resolved', subject: 'Rewritten' }).eq('id', id)).error).toBeNull();
    const { data } = await adminClient().from('support_cases').select('status, subject').eq('id', id).single();
    expect(data).toEqual({ status: 'resolved', subject: 'Export hangs' });
  });
});

describe('routing', () => {
  it('a new case notifies the admins; an answer notifies the opener and waits on them; their reply reopens it', async () => {
    const id = await open(cast.jordan, 'Routing case');
    expect(await notified(`/admin/support?case=${id}`)).toContain(cast.sam.id);
    expect(await notified(`/admin/support?case=${id}`)).not.toContain(cast.riley.id);

    expect((await cast.sam.client.from('support_case_messages').insert({ case_id: id, body: 'Try again now.' })).error).toBeNull();
    const { data: answer } = await adminClient().from('support_case_messages').select('from_admin').eq('case_id', id).order('created_at', { ascending: false }).limit(1).single();
    expect(answer?.from_admin).toBe(true);
    expect(await status(id)).toBe('waiting');
    expect(await notified(`/hub/help/${id}`)).toEqual([cast.jordan.id]);

    expect((await cast.jordan.client.from('support_case_messages').insert({ case_id: id, body: 'Still hangs.' })).error).toBeNull();
    expect(await status(id)).toBe('open');
  });

  it('replying to a resolved case reopens it', async () => {
    const id = await open(cast.jordan);
    await cast.sam.client.from('support_cases').update({ status: 'resolved' }).eq('id', id);
    await cast.jordan.client.from('support_case_messages').insert({ case_id: id, body: 'Back again.' });
    expect(await status(id)).toBe('open');
  });

  it('Riley reads only their own support notifications', async () => {
    const id = await open(cast.jordan);
    await cast.sam.client.from('support_case_messages').insert({ case_id: id, body: 'Answer.' });
    const { data } = await cast.riley.client.from('notifications').select('id').eq('link', `/hub/help/${id}`);
    expect(data).toEqual([]);
  });
});
