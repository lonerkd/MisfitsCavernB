import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCast, destroyCast, adminClient, anonClient, type Cast } from './support/personas';

// Moderation, the first slice: anyone signed in can report a message, a job or a
// profile; they see their own reports; an admin sees every report and settles
// it. As personas: Sam is the platform admin, Jordan and Riley are members.
let cast: Cast;
const target = randomUUID();

beforeAll(async () => {
  cast = await createCast();
  const { error } = await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id);
  if (error) throw error;
});
afterAll(async () => {
  await adminClient().from('reports').delete().eq('target_id', target);
  await destroyCast(cast);
});

const report = (who: 'sam' | 'jordan' | 'riley', over: Record<string, unknown> = {}) =>
  cast[who].client.from('reports').insert({ kind: 'message', target_id: target, reason: 'Spam in the lounge', ...over }).select('id, reporter_id, status, kind').single();

describe('reporting', () => {
  it('a member can report, and the report is theirs', async () => {
    const r = await report('jordan');
    expect(r.error).toBeNull();
    expect(r.data).toMatchObject({ reporter_id: cast.jordan.id, status: 'open', kind: 'message' });
  });

  it('nobody can report as someone else', async () => {
    const spoof = await report('riley', { reporter_id: cast.jordan.id, target_id: randomUUID() });
    expect(spoof.error).not.toBeNull();
  });

  it('reporting the same thing twice is refused, and a different thing is fine', async () => {
    expect((await report('jordan')).error).not.toBeNull();
    const other = randomUUID();
    const r = await report('jordan', { target_id: other, kind: 'job' });
    expect(r.error).toBeNull();
    await adminClient().from('reports').delete().eq('target_id', other);
  });

  it('a report needs a known kind and a reason of sensible length', async () => {
    expect((await report('riley', { kind: 'rumour', target_id: randomUUID() })).error).not.toBeNull();
    expect((await report('riley', { reason: '   ', target_id: randomUUID() })).error).not.toBeNull();
    expect((await report('riley', { reason: 'x'.repeat(501), target_id: randomUUID() })).error).not.toBeNull();
  });

  it('anon cannot report', async () => {
    const { error } = await anonClient().from('reports').insert({ kind: 'message', target_id: randomUUID(), reason: 'x' });
    expect(error).not.toBeNull();
  });
});

describe('who sees and settles reports', () => {
  it('the reporter sees their own; another member sees none of them; anon sees none', async () => {
    expect(((await cast.jordan.client.from('reports').select('id').eq('target_id', target)).data ?? []).length).toBe(1);
    expect((await cast.riley.client.from('reports').select('id').eq('target_id', target)).data ?? []).toEqual([]);
    expect((await anonClient().from('reports').select('id').eq('target_id', target)).data ?? []).toEqual([]);
  });

  it('an admin sees every report and can settle it, recording who did', async () => {
    const seen = (await cast.sam.client.from('reports').select('id, reporter_id').eq('target_id', target)).data ?? [];
    expect(seen.map((r) => r.reporter_id)).toContain(cast.jordan.id);
    const { data, error } = await cast.sam.client.from('reports').update({ status: 'resolved', resolved_by: cast.sam.id, resolved_at: new Date().toISOString() }).eq('id', seen[0].id).select('status, resolved_by').single();
    expect(error).toBeNull();
    expect(data).toEqual({ status: 'resolved', resolved_by: cast.sam.id });
  });

  it('a reporter cannot settle their own report, edit it, or take it back', async () => {
    const mine = (await cast.jordan.client.from('reports').select('id').eq('target_id', target).single()).data!;
    const upd = await cast.jordan.client.from('reports').update({ status: 'dismissed' }).eq('id', mine.id).select();
    expect(upd.data ?? []).toEqual([]);
    const del = await cast.jordan.client.from('reports').delete().eq('id', mine.id).select();
    expect(del.data ?? []).toEqual([]);
    expect((await adminClient().from('reports').select('status').eq('id', mine.id).single()).data?.status).toBe('resolved');
  });
});
