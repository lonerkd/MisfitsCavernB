import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';

// Client-approval gates. A format can name phases that cannot be left until, for
// every script sent for review, its latest sent version is approved by the client
// and confirmed by the team (and one has been sent). The block is in the database
// (a trigger on projects.status), so every path is covered: a plain update, the
// advance_phase gate, the projects board. Moving back is never blocked; a format
// with no gates behaves as before; the system (no signed-in person) is not a gate.
let cast: Cast;
let projectId: string;
let scriptA: string;
let scriptB: string;
const FORMAT = 'Gate test format';
const admin = () => adminClient();
const sam = () => cast.sam.client;
const guest = () => anonClient();

const status = async () => (await admin().from('projects').select('status').eq('id', projectId).single()).data!.status;
const move = (to: string) => sam().from('projects').update({ status: to }).eq('id', projectId);
async function sendVersion(script: string) {
  const v = await sam().from('item_versions').insert({ project_id: projectId, script_id: script, label: 'Round' }).select('id').single();
  expect(v.error).toBeNull();
  expect((await sam().from('item_versions').update({ status: 'sent' }).eq('id', v.data!.id)).error).toBeNull();
  return v.data!.id as string;
}
async function approveAndConfirm(versionId: string) {
  const link = (await sam().from('review_links').insert({ project_id: projectId, version_ids: [versionId] }).select('token').single()).data!;
  expect((await guest().rpc('decide_review', { p_token: link.token, p_version: versionId, p_decision: 'approved', p_name: 'Casey' })).data).toBe(true);
  expect((await sam().from('item_versions').update({ confirmed_at: new Date().toISOString() }).eq('id', versionId)).error).toBeNull();
}

beforeAll(async () => {
  cast = await createCast();
  await admin().from('project_formats').delete().eq('name', FORMAT);
  expect((await admin().from('project_formats').insert({ name: FORMAT, approval_gates: ['development'], position: 99 })).error).toBeNull();
  ({ projectId } = await createCrewedProject(cast, 'Gated project'));
  await admin().from('projects').update({ project_type: FORMAT }).eq('id', projectId);
  scriptA = await createScript(cast, projectId, 'INT. A - DAY');
  scriptB = await createScript(cast, projectId, 'INT. B - DAY');
});
afterAll(async () => {
  await admin().from('projects').delete().eq('id', projectId);
  await admin().from('project_formats').delete().eq('name', FORMAT);
  await destroyCast(cast);
});

describe('the format', () => {
  it('only accepts known phases, never the last one', async () => {
    expect((await admin().from('project_formats').insert({ name: 'Bad gate', approval_gates: ['delivery'], position: 98 })).error).not.toBeNull();
    expect((await admin().from('project_formats').insert({ name: 'Bad gate', approval_gates: ['nonsense'], position: 98 })).error).not.toBeNull();
  });
  it('the shipped advertising and copy formats gate the concept & copy phase', async () => {
    const rows = (await admin().from('project_formats').select('name, approval_gates, skip_phases').in('name', ['Advertising', 'Copywriting'])).data!;
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r.approval_gates).toEqual(['pre-production']);
    expect(rows.find((r) => r.name === 'Copywriting')!.skip_phases).toEqual(['production', 'post-production']);
  });
  it('existing formats have no gates', async () => {
    const all = (await admin().from('project_formats').select('name, approval_gates').neq('name', FORMAT)).data!;
    const gated = all.filter((r) => r.approval_gates.length > 0).map((r) => r.name).sort();
    expect(gated).toEqual(['Advertising', 'Copywriting']);
  });
});

describe('leaving a gated phase', () => {
  it('is refused when nothing has been sent to the client', async () => {
    const res = await move('pre-production');
    expect(res.error?.message).toMatch(/client has not approved/);
    expect(await status()).toBe('concept');
  });

  it('is refused while a sent version is undecided, and while an approval is unconfirmed', async () => {
    const a = await sendVersion(scriptA);
    expect((await move('pre-production')).error).not.toBeNull();
    // the client approves but the team has not confirmed yet
    const link = (await sam().from('review_links').insert({ project_id: projectId, version_ids: [a] }).select('token').single()).data!;
    await guest().rpc('decide_review', { p_token: link.token, p_version: a, p_decision: 'approved', p_name: 'Casey' });
    expect((await move('pre-production')).error).not.toBeNull();
    expect(await status()).toBe('concept');
    // confirmed: this script is fine
    await sam().from('item_versions').update({ confirmed_at: new Date().toISOString() }).eq('id', a);
  });

  it('every sent script must be approved: a second one blocks until it is', async () => {
    const b = await sendVersion(scriptB);
    expect((await move('pre-production')).error).not.toBeNull();
    await approveAndConfirm(b);
    expect((await move('pre-production')).error).toBeNull();
    expect(await status()).toBe('pre-production');
  });

  it('a newer sent version re-opens the question; moving back is never blocked', async () => {
    expect((await move('concept')).error).toBeNull();
    const a2 = await sendVersion(scriptA);
    expect((await move('pre-production')).error).not.toBeNull();
    await approveAndConfirm(a2);
    expect((await move('pre-production')).error).toBeNull();
  });

  it('cannot be skipped by jumping past the gated phase', async () => {
    expect((await move('concept')).error).toBeNull();
    const a3 = await sendVersion(scriptA);
    expect((await move('production')).error).not.toBeNull();
    await approveAndConfirm(a3);
    expect((await move('production')).error).toBeNull();
    expect((await move('concept')).error).toBeNull();
  });

  it('is refused through advance_phase too, with nothing archived', async () => {
    await sendVersion(scriptB); // undecided again
    const res = await sam().rpc('advance_phase', { p_project: projectId, p_to: 'pre-production', p_default: 'archive', p_exceptions: [] });
    expect(res.error?.message).toMatch(/client has not approved/);
    expect(await status()).toBe('concept');
  });

  it('an unrecognised status is no way round it: it counts as the earliest phase', async () => {
    expect((await move('zz-not-a-phase')).error).toBeNull(); // sideways/back is free
    expect((await move('post-production')).error).not.toBeNull(); // forward from "earliest" meets every gate
    expect((await move('concept')).error).toBeNull();
    expect(await status()).toBe('concept');
  });

  it('only gates the phases the format names: a later phase can be left freely', async () => {
    await admin().from('projects').update({ status: 'pre-production' }).eq('id', projectId); // system update: not a person
    expect((await move('production')).error).toBeNull(); // leaving pre-production is not gated here
    await admin().from('projects').update({ status: 'concept' }).eq('id', projectId);
  });
});

describe('who is and is not gated', () => {
  it('a project in a format with no gates is unaffected', async () => {
    await admin().from('projects').update({ project_type: 'Feature' }).eq('id', projectId);
    expect((await move('pre-production')).error).toBeNull();
    expect((await move('concept')).error).toBeNull();
    await admin().from('projects').update({ project_type: FORMAT }).eq('id', projectId);
  });

  it('the system (no signed-in person) is not a gate', async () => {
    expect((await admin().from('projects').update({ status: 'pre-production' }).eq('id', projectId)).error).toBeNull();
    await admin().from('projects').update({ status: 'concept' }).eq('id', projectId);
  });

  it('Riley still cannot move the phase at all', async () => {
    await cast.riley.client.from('projects').update({ status: 'pre-production' }).eq('id', projectId);
    expect(await status()).toBe('concept');
  });
});
