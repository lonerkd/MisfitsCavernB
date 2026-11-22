import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, type Cast } from './support/personas';

// BACKLOG 3.53: each notification records when it was read (stamped by the database), when its push went out and why it did not (written
// only by the push sender). A person's own writes cannot touch the push fields or forge the read time; nobody reads another's notification.
let cast: Cast;
beforeAll(async () => { cast = await createCast(); });
afterAll(async () => { await destroyCast(cast); });

const mine = (c: any, id: string) => c.from('notifications').select('read, read_at, pushed_at, push_skipped').eq('id', id).single();
async function makeFor(userId: string, extra: object = {}) {
  const r = await adminClient().from('notifications').insert({ user_id: userId, type: 'note', title: 'A note', ...extra }).select('id').single();
  expect(r.error).toBeNull();
  return r.data!.id as string;
}

describe('notification timing', () => {
  it('read_at is stamped by the database when the person reads it, and cleared when they mark it unread', async () => {
    const id = await makeFor(cast.sam.id);
    expect((await mine(cast.sam.client, id)).data.read_at).toBeNull();
    const t = await cast.sam.client.from('notifications').update({ read: true, read_at: '2000-01-01T00:00:00Z' }).eq('id', id);
    expect(t.error).toBeNull();
    const { data } = await mine(cast.sam.client, id);
    expect(data.read).toBe(true);
    expect(new Date(data.read_at).getFullYear()).toBeGreaterThanOrEqual(2026);
    await cast.sam.client.from('notifications').update({ read: false }).eq('id', id);
    expect((await mine(cast.sam.client, id)).data.read_at).toBeNull();
  });

  it('a person cannot write the push fields on their own notification', async () => {
    const id = await makeFor(cast.sam.id);
    await cast.sam.client.from('notifications').update({ pushed_at: new Date().toISOString(), push_skipped: 'quiet-hours' }).eq('id', id);
    const { data } = await mine(cast.sam.client, id);
    expect(data.pushed_at).toBeNull();
    expect(data.push_skipped).toBeNull();
  });

  it('the push sender (no signed-in person) can record the outcome, and a person’s later update keeps it', async () => {
    const id = await makeFor(cast.sam.id);
    const when = new Date().toISOString();
    expect((await adminClient().from('notifications').update({ pushed_at: when }).eq('id', id)).error).toBeNull();
    await cast.sam.client.from('notifications').update({ read: true, pushed_at: null }).eq('id', id);
    const { data } = await mine(cast.sam.client, id);
    expect(data.pushed_at).not.toBeNull();
    expect(data.read_at).not.toBeNull();
    const skipped = await makeFor(cast.sam.id);
    expect((await adminClient().from('notifications').update({ push_skipped: 'quiet-hours' }).eq('id', skipped)).error).toBeNull();
    expect((await mine(cast.sam.client, skipped)).data.push_skipped).toBe('quiet-hours');
  });

  it('only the known reasons are accepted', async () => {
    const id = await makeFor(cast.sam.id);
    expect((await adminClient().from('notifications').update({ push_skipped: 'because' }).eq('id', id)).error).not.toBeNull();
  });

  it('nobody else sees the timing', async () => {
    const id = await makeFor(cast.sam.id);
    expect((await cast.riley.client.from('notifications').select('read_at, pushed_at').eq('id', id)).data).toEqual([]);
    expect((await cast.jordan.client.from('notifications').select('read_at').eq('id', id)).data).toEqual([]);
  });
});
