import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, createPersona, destroyCast, adminClient, anonClient, PASSWORD, type Cast, type Client, type Persona } from './support/personas';

// Moderation, slice 2: an admin acts on a report. Hide a message / job / a
// profile's public page (hidden is invisible to everyone but the author, who
// reads that moderators removed it, and to admins); suspend an author (the
// database refuses their writes even on a session they already hold; reinstate
// lifts it); dismiss. As personas: Casey is the platform admin; Sam, Jordan
// and Riley are ordinary members and may do none of it. Jordan authors the
// message and the job and owns the page; Riley is the outsider and the
// reporter, and is the one suspended.
//
// The moderation functions are not in the generated types until `npm run db:types` is run, so they are
// called through these two small untyped helpers.
type Result = { data: unknown; error: { message: string } | null };
const rpc = (c: Client, fn: string, args: Record<string, unknown>): Promise<Result> =>
  (c.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<Result>).call(c, fn, args);
type Row = Record<string, unknown>;
const jobRow = async (c: Client, id: string): Promise<Row | null> =>
  ((await c.from('jobs').select('*').eq('id', id).maybeSingle()).data as Row | null) ?? null;
const updateJob = async (c: Client, id: string, patch: Row) =>
  (await (c.from('jobs') as unknown as { update(v: Row): { eq(k: string, v: string): Promise<Result> } }).update(patch).eq('id', id));

const NOTICE = '[Removed by an admin]';
let cast: Cast;
let casey: Persona;
let channelId = '';
let messageId = '';
let jobId = '';
const reports: string[] = [];

const report = async (reporter: Persona, kind: 'message' | 'job' | 'profile', target: string, reason = 'Bad') => {
  const { data, error } = await adminClient().from('reports').insert({ reporter_id: reporter.id, kind, target_id: target, reason }).select('id').single();
  if (error) throw error;
  reports.push(data.id);
  return data.id;
};
const reportState = async (id: string) => (await adminClient().from('reports').select('*').eq('id', id).single()).data as unknown as { status: string; outcome: string | null; resolved_by: string | null };
const authIds = () => [cast.jordan.id, cast.riley.id, jobId, messageId];

beforeAll(async () => {
  cast = await createCast();
  casey = await createPersona('casey');
  const db = adminClient();
  await db.from('profiles').update({ is_admin: true }).eq('id', casey.id);
  const ch = await db.from('channels').insert({ name: `mod-${Date.now()}`, project_id: null, type: 'text', audience: 'users', post_policy: 'viewers', created_by: cast.sam.id }).select('id').single();
  if (ch.error) throw ch.error;
  channelId = ch.data.id;
  const m = await db.from('messages').insert({ sender_id: cast.jordan.id, channel_uuid: channelId, content: 'Send me money first' }).select('id').single();
  if (m.error) throw m.error;
  messageId = m.data.id;
  const j = await cast.jordan.client.from('jobs').insert({ title: 'Free gig', role: 'Gaffer', created_by: cast.jordan.id, status: 'open' }).select('id').single();
  if (j.error) throw j.error;
  jobId = j.data.id;
  await cast.jordan.client.from('profiles').update({ portfolio_page: 'public' }).eq('id', cast.jordan.id);
});
afterAll(async () => {
  const db = adminClient();
  await db.from('audit_logs').delete().in('resource_id', [...authIds(), ...reports]);
  await db.from('reports').delete().in('id', reports);
  await db.from('job_applications').delete().eq('job_id', jobId);
  await db.from('jobs').delete().eq('id', jobId);
  await db.from('channels').delete().eq('id', channelId);
  await db.from('profiles').update({ is_admin: false }).eq('id', casey.id);
  await destroyCast({ ...cast, casey });
});

describe('who can moderate', () => {
  it('Sam, Jordan, Riley and anon cannot hide, suspend, dismiss or read a report state', async () => {
    const rid = await report(cast.riley, 'job', jobId);
    for (const c of [cast.sam.client, cast.jordan.client, cast.riley.client, anonClient()]) {
      expect((await rpc(c, 'admin_moderate_report', { p_report: rid, p_action: 'hide', p_reason: 'x' })).error).not.toBeNull();
      expect((await rpc(c, 'admin_moderate_report', { p_report: rid, p_action: 'suspend', p_reason: 'x' })).error).not.toBeNull();
      expect((await rpc(c, 'admin_moderate_report', { p_report: rid, p_action: 'dismiss' })).error).not.toBeNull();
      expect((await rpc(c, 'admin_hide_content', { p_kind: 'job', p_target: jobId, p_hidden: true })).error).not.toBeNull();
      expect((await rpc(c, 'admin_report_target', { p_report: rid })).error).not.toBeNull();
    }
    expect((await jobRow(cast.riley.client, jobId))?.hidden_at).toBeNull();
    expect((await reportState(rid)).status).toBe('open');
  });

  it('a member cannot set the moderation columns on their own rows', async () => {
    expect((await updateJob(cast.jordan.client, jobId, { hidden_at: new Date().toISOString() })).error).not.toBeNull();
    expect((await cast.jordan.client.from('profiles').update({ suspended_at: new Date().toISOString(), hidden_at: new Date().toISOString() } as never).eq('id', cast.jordan.id)).error).not.toBeNull();
    expect((await jobRow(cast.riley.client, jobId))?.hidden_at).toBeNull();
  });

  it('an admin needs a reason to hide or suspend', async () => {
    const rid = reports[0];
    expect((await rpc(casey.client, 'admin_moderate_report', { p_report: rid, p_action: 'hide', p_reason: '  ' })).error?.message).toMatch(/why/i);
    expect((await rpc(casey.client, 'admin_moderate_report', { p_report: rid, p_action: 'nope', p_reason: 'x' })).error).not.toBeNull();
  });
});

describe('hiding a job', () => {
  it('an admin hides it: Riley and anon cannot read it, Jordan reads the note, the admin still reads it, the report is resolved and logged', async () => {
    const rid = reports[0];
    expect(await rpc(casey.client, 'admin_report_target', { p_report: rid })).toMatchObject({ error: null, data: [{ author_id: cast.jordan.id, hidden: false, suspended: false }] });
    const { error } = await rpc(casey.client, 'admin_moderate_report', { p_report: rid, p_action: 'hide', p_reason: 'Asks for money up front' });
    expect(error).toBeNull();
    expect(await jobRow(cast.riley.client, jobId)).toBeNull();
    expect(await jobRow(anonClient(), jobId)).toBeNull();
    expect((await cast.riley.client.from('jobs').select('id').eq('status', 'open').eq('id', jobId)).data ?? []).toEqual([]);
    const mine = await jobRow(cast.jordan.client, jobId);
    expect(mine?.hidden_at).not.toBeNull();
    expect(mine?.hidden_reason).toBe('Asks for money up front');
    expect((await jobRow(casey.client, jobId))?.hidden_at).not.toBeNull();
    expect(await reportState(rid)).toMatchObject({ status: 'resolved', outcome: 'hidden', resolved_by: casey.id });
    const log = (await adminClient().from('audit_logs').select('user_id, action, resource_type').eq('resource_id', jobId)).data ?? [];
    expect(log).toEqual([{ user_id: casey.id, action: 'admin_hide_job', resource_type: 'job' }]);
    const settled = (await adminClient().from('audit_logs').select('action, details').eq('resource_id', rid)).data ?? [];
    expect(settled).toEqual([{ action: 'admin_moderate_report', details: { action: 'hide', kind: 'job', target: jobId, reason: 'Asks for money up front' } }]);
  });

  it('the poster cannot bring it back, and nobody can apply to it', async () => {
    expect((await updateJob(cast.jordan.client, jobId, { hidden_at: null })).error).not.toBeNull();
    expect((await jobRow(cast.riley.client, jobId))).toBeNull();
    const apply = await cast.riley.client.from('job_applications').insert({ job_id: jobId, applicant_id: cast.riley.id });
    expect(apply.error).not.toBeNull();
  });

  it('bringing it back makes it visible again', async () => {
    expect((await rpc(casey.client, 'admin_hide_content', { p_kind: 'job', p_target: jobId, p_hidden: false })).error).toBeNull();
    expect((await jobRow(cast.riley.client, jobId))?.hidden_at).toBeNull();
    expect((await jobRow(anonClient(), jobId))?.id).toBe(jobId);
  });
});

describe('hiding a message', () => {
  it('Riley and Jordan read the notice, never the words; the admin reads the original; the report records it', async () => {
    const rid = await report(cast.riley, 'message', messageId, 'Scam');
    expect((await rpc(casey.client, 'admin_moderate_report', { p_report: rid, p_action: 'hide', p_reason: 'Scam' })).error).toBeNull();
    for (const who of ['jordan', 'riley'] as const) {
      const m = (await cast[who].client.from('messages').select('content, hidden_at').eq('id', messageId).single()).data;
      expect(m?.content).toBe(NOTICE);
      expect(m?.hidden_at).not.toBeNull();
    }
    expect((await rpc(casey.client, 'admin_reported_message', { p_report: rid })).data).toMatchObject([{ content: 'Send me money first', hidden: true }]);
    expect(await reportState(rid)).toMatchObject({ status: 'resolved', outcome: 'hidden' });
  });
});

describe('taking a public page down', () => {
  it('turns it off and Jordan cannot turn it back on until it is restored', async () => {
    const rid = await report(cast.riley, 'profile', cast.jordan.id, 'Impersonation');
    expect((await rpc(casey.client, 'admin_moderate_report', { p_report: rid, p_action: 'hide', p_reason: 'Impersonation' })).error).toBeNull();
    expect((await adminClient().from('profiles').select('portfolio_page').eq('id', cast.jordan.id).single()).data?.portfolio_page).toBe('off');
    expect((await cast.jordan.client.from('profiles').update({ portfolio_page: 'public' }).eq('id', cast.jordan.id)).error).not.toBeNull();
    expect((await adminClient().from('profiles').select('portfolio_page').eq('id', cast.jordan.id).single()).data?.portfolio_page).toBe('off');
    expect((await rpc(casey.client, 'admin_hide_content', { p_kind: 'profile', p_target: cast.jordan.id, p_hidden: false })).error).toBeNull();
    expect((await cast.jordan.client.from('profiles').update({ portfolio_page: 'public' }).eq('id', cast.jordan.id)).error).toBeNull();
  });
});

describe('suspending an author', () => {
  let rileyReport = '';
  it('an admin suspends Riley from a report about their profile; the report says so and the reason is kept', async () => {
    rileyReport = await report(cast.jordan, 'profile', cast.riley.id, 'Harassment');
    const { error } = await rpc(casey.client, 'admin_moderate_report', { p_report: rileyReport, p_action: 'suspend', p_reason: 'Harassing crew' });
    expect(error).toBeNull();
    expect(await reportState(rileyReport)).toMatchObject({ status: 'resolved', outcome: 'suspended' });
    expect(await rpc(casey.client, 'admin_report_target', { p_report: rileyReport })).toMatchObject({ data: [{ author_id: cast.riley.id, suspended: true, suspended_reason: 'Harassing crew' }] });
    const log = (await adminClient().from('audit_logs').select('action').eq('resource_id', cast.riley.id)).data ?? [];
    expect(log).toEqual([{ action: 'admin_suspend_user' }]);
  });

  it('their writes are refused, with a plain sentence, on the session they already hold', async () => {
    const c = cast.riley.client; // its access token is still valid; only sign-in and refresh are banned
    const msg = await c.from('messages').insert({ sender_id: cast.riley.id, channel_uuid: channelId, content: 'still here' });
    expect(msg.error?.message).toMatch(/account is suspended/i);
    const job = await c.from('jobs').insert({ title: 'Spam', role: 'Gaffer', created_by: cast.riley.id, status: 'open' });
    expect(job.error?.message).toMatch(/account is suspended/i);
    const apply = await c.from('job_applications').insert({ job_id: jobId, applicant_id: cast.riley.id });
    expect(apply.error?.message).toMatch(/account is suspended/i);
    const rep = await c.from('reports').insert({ kind: 'job', target_id: jobId, reason: 'retaliation' });
    expect(rep.error?.message).toMatch(/account is suspended/i);
    expect(((await adminClient().from('messages').select('id').eq('sender_id', cast.riley.id)).data ?? [])).toEqual([]);
  });

  it('they can still read, and Jordan is not affected', async () => {
    expect((await jobRow(cast.riley.client, jobId))?.id).toBe(jobId);
    const ok = await cast.jordan.client.from('messages').insert({ sender_id: cast.jordan.id, channel_uuid: channelId, content: 'fine' }).select('id').single();
    expect(ok.error).toBeNull();
  });

  it('reinstating lifts it: Riley signs in again and can write', async () => {
    expect((await rpc(casey.client, 'admin_set_suspended', { p_user: cast.riley.id, p_suspended: false })).error).toBeNull();
    expect(await rpc(casey.client, 'admin_report_target', { p_report: rileyReport })).toMatchObject({ data: [{ suspended: false, suspended_reason: null }] });
    const fresh = anonClient();
    expect((await fresh.auth.signInWithPassword({ email: cast.riley.email, password: PASSWORD })).error).toBeNull();
    const ok = await fresh.from('messages').insert({ sender_id: cast.riley.id, channel_uuid: channelId, content: 'back' }).select('id').single();
    expect(ok.error).toBeNull();
    expect((await fresh.from('reports').insert({ kind: 'profile', target_id: cast.sam.id, reason: 'Fair' })).error).toBeNull();
  });

  it('an admin cannot be suspended through a report either', async () => {
    const rid = await report(cast.jordan, 'profile', casey.id, 'x');
    expect((await rpc(casey.client, 'admin_moderate_report', { p_report: rid, p_action: 'suspend', p_reason: 'x' })).error).not.toBeNull();
    expect((await reportState(rid)).status).toBe('open');
  });
});

describe('dismissing', () => {
  it('dismisses an open report without touching the thing, once', async () => {
    const rid = await report(cast.sam, 'job', jobId, 'Meh');
    expect((await rpc(casey.client, 'admin_moderate_report', { p_report: rid, p_action: 'dismiss' })).error).toBeNull();
    expect(await reportState(rid)).toMatchObject({ status: 'dismissed', outcome: null, resolved_by: casey.id });
    expect((await jobRow(cast.riley.client, jobId))?.hidden_at).toBeNull();
    expect((await rpc(casey.client, 'admin_moderate_report', { p_report: rid, p_action: 'dismiss' })).error?.message).toMatch(/already settled/i);
  });
});
