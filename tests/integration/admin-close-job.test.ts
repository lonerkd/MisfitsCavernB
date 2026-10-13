import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, adminClient, anonClient, type Cast } from './support/personas';

// Acting on a report: a platform admin can close a job that was reported, even
// though it is not theirs; nobody else can, and it is recorded. As personas:
// Sam is the platform admin, Jordan posts the job, Riley is an ordinary member.
let cast: Cast;
let jobId = '';

beforeAll(async () => {
  cast = await createCast();
  await adminClient().from('profiles').update({ is_admin: true }).eq('id', cast.sam.id);
  const job = await adminClient().from('jobs').insert({ title: 'Free gig', role: 'Gaffer', created_by: cast.jordan.id, status: 'open' }).select('id').single();
  if (job.error) throw job.error;
  jobId = job.data.id;
});
afterAll(async () => {
  await adminClient().from('audit_logs').delete().eq('resource_id', jobId);
  await adminClient().from('jobs').delete().eq('id', jobId);
  await destroyCast(cast);
});

const status = async () => (await adminClient().from('jobs').select('status').eq('id', jobId).single()).data?.status;

describe('admin_close_job', () => {
  it('an ordinary member cannot close someone else’s job', async () => {
    const { error } = await cast.riley.client.rpc('admin_close_job', { p_job: jobId });
    expect(error).not.toBeNull();
    expect(await status()).toBe('open');
  });

  it('anon cannot', async () => {
    const { error } = await anonClient().rpc('admin_close_job', { p_job: jobId });
    expect(error).not.toBeNull();
    expect(await status()).toBe('open');
  });

  it('the poster still closes their own job the usual way (not through this)', async () => {
    const { error } = await cast.jordan.client.rpc('admin_close_job', { p_job: jobId });
    expect(error).not.toBeNull(); // it is the admin's tool; posters have `update`
    expect(await status()).toBe('open');
  });

  it('a platform admin closes it, and the action is on the record', async () => {
    const { error } = await cast.sam.client.rpc('admin_close_job', { p_job: jobId });
    expect(error).toBeNull();
    expect(await status()).toBe('closed');
    const log = (await adminClient().from('audit_logs').select('user_id, action, resource_type').eq('resource_id', jobId)).data ?? [];
    expect(log).toEqual([{ user_id: cast.sam.id, action: 'admin_close_job', resource_type: 'job' }]);
  });

  it('a job that does not exist is a plain error', async () => {
    const { error } = await cast.sam.client.rpc('admin_close_job', { p_job: '00000000-0000-0000-0000-000000000000' });
    expect(error).not.toBeNull();
  });
});
