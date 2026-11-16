import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, adminClient, type Cast } from './support/personas';

// Settling a report tells the person who filed it. As personas: Sam is the platform
// admin, Riley filed the report, Jordan is the person reported (a profile) and must
// hear nothing. The words say only the kind of thing, never the content or the name.
let cast: Cast;
const reportIds: string[] = [];
const SECRET_REASON = 'Jordan keeps sending a scam link, Jordan is a fraud';

const mine = async (who: 'riley' | 'jordan' | 'sam') =>
  (await cast[who].client.from('notifications').select('title, body, type, link').eq('type', 'report').order('created_at')).data ?? [];

async function fileReport(kind: 'message' | 'job' | 'profile', target: string) {
  const r = await cast.riley.client.from('reports').insert({ kind, target_id: target, reason: SECRET_REASON }).select('id').single();
  if (r.error) throw r.error;
  reportIds.push(r.data.id);
  return r.data.id;
}

beforeAll(async () => {
  cast = await createCast();
  await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id);
});
afterAll(async () => {
  const db = adminClient();
  await db.from('notifications').delete().eq('type', 'report').in('user_id', [cast.riley.id, cast.jordan.id, cast.sam.id]);
  await db.from('reports').delete().in('id', reportIds);
  await db.from('profiles').update({ is_admin: false }).eq('id', cast.sam.id);
  await destroyCast(cast);
});

describe('the reporter hears how their report ended', () => {
  it('nothing is sent while a report is open', async () => {
    await fileReport('profile', cast.jordan.id);
    expect(await mine('riley')).toEqual([]);
  });

  it('resolving notifies the reporter, not the reported person, and says only the kind of thing', async () => {
    const id = reportIds[0];
    const { error } = await cast.sam.client.from('reports').update({ status: 'resolved', resolved_by: cast.sam.id, resolved_at: new Date().toISOString() }).eq('id', id);
    expect(error).toBeNull();
    const got = await mine('riley');
    expect(got).toHaveLength(1);
    expect(got[0].title).toBe('Your report was resolved');
    expect(got[0].body).toContain('a profile you reported');
    const text = `${got[0].title} ${got[0].body} ${got[0].link ?? ''}`;
    expect(text).not.toContain(cast.jordan.username);
    expect(text).not.toContain(cast.jordan.id);
    expect(text).not.toContain('scam');
    expect(await mine('jordan')).toEqual([]);
    expect(await mine('sam')).toEqual([]);
  });

  it('dismissing notifies the reporter with the outcome', async () => {
    const target = crypto.randomUUID();
    const id = await fileReport('job', target);
    const { error } = await cast.sam.client.from('reports').update({ status: 'dismissed', resolved_by: cast.sam.id, resolved_at: new Date().toISOString() }).eq('id', id);
    expect(error).toBeNull();
    const got = await mine('riley');
    expect(got).toHaveLength(2);
    expect(got[1].title).toBe('Your report was dismissed');
    expect(got[1].body).toContain('a job you reported');
    expect(got[1].body).not.toContain(target);
  });

  it('settling again does not notify twice', async () => {
    const { error } = await cast.sam.client.from('reports').update({ status: 'dismissed' }).eq('id', reportIds[0]);
    expect(error).toBeNull();
    expect(await mine('riley')).toHaveLength(2);
  });

  it('the reporter cannot settle their own report, so cannot notify themselves', async () => {
    const id = await fileReport('message', crypto.randomUUID());
    const { data } = await cast.riley.client.from('reports').update({ status: 'resolved' }).eq('id', id).select('id');
    expect(data ?? []).toEqual([]);
    expect(await mine('riley')).toHaveLength(2);
  });
});
