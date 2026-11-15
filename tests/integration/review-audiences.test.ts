import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';

// The outside roles: a review link is for an audience, and the database holds each to what it may do.
// Sam owns the project and makes the links; the audiences are anonymous (a token, no account); Riley is a signed-in outsider.
let cast: Cast;
let projectId: string;
let versionId: string;
const tokens: Record<string, string> = {};

const sam = () => cast.sam.client;
const guest = () => anonClient();

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Audiences'));
  const scriptId = await createScript(cast, projectId, 'INT. ROOM - DAY\n\nThe pitch.');
  const v = await sam().from('item_versions').insert({ project_id: projectId, script_id: scriptId, label: 'Cut 1' }).select('id').single();
  expect(v.error).toBeNull();
  versionId = v.data!.id;
  expect((await sam().from('item_versions').update({ status: 'sent' }).eq('id', versionId)).error).toBeNull();
  for (const layer of ['guest', 'investor', 'distributor', 'press']) {
    const l = await sam().from('review_links').insert({ project_id: projectId, version_ids: [versionId], label: layer, layer }).select('token').single();
    expect(l.error).toBeNull();
    tokens[layer] = l.data!.token;
  }
});
afterAll(async () => {
  await adminClient().from('projects').delete().eq('id', projectId);
  await destroyCast(cast);
});

const decide = (t: string) => guest().rpc('decide_review', { p_token: t, p_version: versionId, p_decision: 'approved', p_name: 'Visitor', p_note: '' });
const comment = (t: string) => guest().rpc('add_review_comment', { p_token: t, p_version: versionId, p_name: 'Visitor', p_body: 'A thought.' });
const guestDecision = async () => (await adminClient().from('item_versions').select('guest_decision').eq('id', versionId).single()).data!.guest_decision;

describe('review links by audience', () => {
  it('every audience reads the version through its own link', async () => {
    for (const layer of Object.keys(tokens)) {
      const r = await guest().rpc('get_review', { p_token: tokens[layer] });
      expect(r.error).toBeNull();
      expect(r.data).toMatchObject({ layer, versions: [expect.objectContaining({ number: 1 })] });
    }
  });

  it('only the client may approve: an investor, a distributor and the press are refused, and nothing changes', async () => {
    for (const layer of ['investor', 'distributor', 'press']) expect((await decide(tokens[layer])).data).toBe(false);
    expect(await guestDecision()).toBeNull();
  });

  it('investor and distributor may comment; the press may not', async () => {
    expect((await comment(tokens.investor)).data).toBe(true);
    expect((await comment(tokens.distributor)).data).toBe(true);
    expect((await comment(tokens.press)).data).toBe(false);
    const rows = await adminClient().from('review_comments').select('guest_name').eq('version_id', versionId);
    expect(rows.data).toHaveLength(2);
  });

  it('the client still reads, comments and approves, as before', async () => {
    expect((await comment(tokens.guest)).data).toBe(true);
    expect((await decide(tokens.guest)).data).toBe(true);
    expect(await guestDecision()).toBe('approved');
  });

  it('a link needs a known audience, only people who shape the project make one, and an outsider reads no token', async () => {
    const bad = await sam().from('review_links').insert({ project_id: projectId, version_ids: [versionId], layer: 'everyone' });
    expect(bad.error).not.toBeNull();
    const riley = await cast.riley.client.from('review_links').insert({ project_id: projectId, version_ids: [versionId], layer: 'press' });
    expect(riley.error).not.toBeNull();
    expect((await cast.riley.client.from('review_links').select('token').eq('project_id', projectId)).data ?? []).toHaveLength(0);
    expect((await guest().from('review_links').select('token')).data ?? []).toHaveLength(0);
  });

  it('a revoked press link reads nothing', async () => {
    const l = await adminClient().from('review_links').select('id').eq('token', tokens.press).single();
    await sam().from('review_links').update({ revoked_at: new Date().toISOString() }).eq('id', l.data!.id);
    const r = await guest().rpc('get_review', { p_token: tokens.press });
    expect(r.data ?? null).toBeNull();
  });
});
