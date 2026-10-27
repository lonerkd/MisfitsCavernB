import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';

// Versions and the guest review link (D1). The database takes the snapshot; a
// sent version can't be rewritten; a guest holds only a token and reaches the
// project only through get_review / add_review_comment / decide_review; Riley
// and anon read nothing directly; the comment cap and the revoke hold.
let cast: Cast;
let projectId: string;
let scriptId: string;
let otherScript: string;
let sent: string; // a sent version
let sentB: string; // a second sent version, not on the link
let draft: string;
let token: string;
let linkId: string;

const admin = () => adminClient();
const sam = () => cast.sam.client;
const guest = () => anonClient();

async function newVersion(client = sam(), script = scriptId) {
  return client.from('item_versions').insert({ project_id: projectId, script_id: script, label: 'Round' }).select('id, number, snapshot, status').single();
}
async function send(id: string) {
  const res = await sam().from('item_versions').update({ status: 'sent' }).eq('id', id);
  expect(res.error).toBeNull();
}

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Review project'));
  scriptId = await createScript(cast, projectId, 'INT. KITCHEN - DAY\n\nFirst draft.');
  otherScript = await createScript(cast, projectId, 'EXT. ROOF - NIGHT\n\nAnother piece.');
  const a = await newVersion();
  expect(a.error).toBeNull();
  sent = a.data!.id;
  await send(sent);
  const b = await newVersion(sam(), otherScript);
  sentB = b.data!.id;
  await send(sentB);
  draft = (await newVersion()).data!.id;
  const link = await sam().from('review_links').insert({ project_id: projectId, version_ids: [sent], label: 'Client round 1' }).select('id, token').single();
  expect(link.error).toBeNull();
  token = link.data!.token;
  linkId = link.data!.id;
});
afterAll(async () => {
  await admin().from('projects').delete().eq('id', projectId);
  await destroyCast(cast);
});

describe('versions', () => {
  it('the database takes the snapshot and numbers them; later edits to the script do not touch it', async () => {
    const first = (await admin().from('item_versions').select('number, snapshot').eq('id', sent).single()).data!;
    expect(first).toEqual({ number: 1, snapshot: 'INT. KITCHEN - DAY\n\nFirst draft.' });
    await admin().from('scripts').update({ content: 'Rewritten entirely.' }).eq('id', scriptId);
    expect((await admin().from('item_versions').select('snapshot').eq('id', sent).single()).data!.snapshot).toBe(first.snapshot);
    const second = await newVersion();
    expect(second.data).toMatchObject({ number: 3, snapshot: 'Rewritten entirely.', status: 'draft' });
    await admin().from('item_versions').delete().eq('id', second.data!.id);
  });

  it('a client cannot supply the snapshot, the status or the guest decision', async () => {
    const forged = await sam().from('item_versions').insert({ project_id: projectId, script_id: scriptId, snapshot: 'forged' } as never);
    expect(forged.error).not.toBeNull();
    expect((await sam().from('item_versions').update({ snapshot: 'forged' } as never).eq('id', sent)).error).not.toBeNull();
    expect((await sam().from('item_versions').update({ guest_decision: 'approved' } as never).eq('id', sent)).error).not.toBeNull();
    expect((await admin().from('item_versions').select('guest_decision').eq('id', sent).single()).data!.guest_decision).toBeNull();
  });

  it('a version only goes draft -> sent, and never back', async () => {
    expect((await sam().from('item_versions').update({ status: 'draft' }).eq('id', sent)).error).not.toBeNull();
  });

  it('a viewer can propose a version but not send one; Riley can do neither', async () => {
    await admin().from('project_crew').update({ role: 'viewer' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    const proposed = await newVersion(cast.jordan.client);
    expect(proposed.error).toBeNull();
    await cast.jordan.client.from('item_versions').update({ status: 'sent' }).eq('id', proposed.data!.id);
    expect((await admin().from('item_versions').select('status').eq('id', proposed.data!.id).single()).data!.status).toBe('draft');
    expect((await cast.riley.client.from('item_versions').insert({ project_id: projectId, script_id: scriptId })).error).not.toBeNull();
    expect((await cast.riley.client.from('item_versions').select('id').eq('project_id', projectId)).data).toEqual([]);
    await admin().from('item_versions').delete().eq('id', proposed.data!.id);
    await admin().from('project_crew').update({ role: 'contributor' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
  });
});

describe('review links', () => {
  it('can only name sent versions of the project', async () => {
    expect((await sam().from('review_links').insert({ project_id: projectId, version_ids: [draft] })).error).not.toBeNull();
    expect((await sam().from('review_links').insert({ project_id: projectId, version_ids: [crypto.randomUUID()] })).error).not.toBeNull();
  });

  it('the token is a credential: only a shaper reads links; the token is long and cannot be chosen', async () => {
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect((await cast.riley.client.from('review_links').select('token').eq('project_id', projectId)).data).toEqual([]);
    await admin().from('project_crew').update({ role: 'viewer' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect((await cast.jordan.client.from('review_links').select('token').eq('project_id', projectId)).data).toEqual([]);
    await admin().from('project_crew').update({ role: 'contributor' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    expect((await sam().from('review_links').insert({ project_id: projectId, version_ids: [sent], token: 'x'.repeat(40) } as never)).error).not.toBeNull();
    expect((await anonClient().from('review_links').select('token')).data ?? []).toEqual([]);
  });
});

describe('the guest', () => {
  it('reads only the versions on the link, with no ids beyond them', async () => {
    const res = await guest().rpc('get_review', { p_token: token });
    expect(res.error).toBeNull();
    const body = res.data as { layer: string; versions: Array<{ id: string; number: number; snapshot: string; script_title: string }> };
    expect(body.layer).toBe('guest');
    expect(body.versions.map((v) => v.id)).toEqual([sent]);
    expect(body.versions[0].snapshot).toContain('First draft.');
    expect(JSON.stringify(body)).not.toContain(projectId);
  });

  it('an unknown, revoked or expired token is the same empty answer', async () => {
    const unknown = (await guest().rpc('get_review', { p_token: 'nope'.repeat(10) })).data;
    expect(unknown).toBeNull();
    const revokedLink = (await sam().from('review_links').insert({ project_id: projectId, version_ids: [sent] }).select('id, token').single()).data!;
    expect((await guest().rpc('get_review', { p_token: revokedLink.token })).data).not.toBeNull();
    await sam().from('review_links').update({ revoked_at: new Date().toISOString() }).eq('id', revokedLink.id);
    expect((await guest().rpc('get_review', { p_token: revokedLink.token })).data).toEqual(unknown);
    const expired = (await sam().from('review_links').insert({ project_id: projectId, version_ids: [sent], expires_at: new Date(Date.now() - 1000).toISOString() }).select('token').single()).data!;
    expect((await guest().rpc('get_review', { p_token: expired.token })).data).toEqual(unknown);
  });

  it('anon has no table access', async () => {
    for (const table of ['item_versions', 'review_links', 'review_comments'] as const) {
      const res = await anonClient().from(table).select('id');
      expect(res.data ?? []).toEqual([]);
    }
    expect((await anonClient().from('review_comments').insert({ version_id: sent, guest_name: 'x', body: 'y' })).error).not.toBeNull();
  });

  it('comments with a name; refuses empty, over-long and off-link; the team sees them', async () => {
    expect((await guest().rpc('add_review_comment', { p_token: token, p_version: sent, p_name: 'Casey (client)', p_body: 'Love the opening.' })).data).toBe(true);
    expect((await guest().rpc('add_review_comment', { p_token: token, p_version: sent, p_name: '  ', p_body: 'x' })).data).toBe(false);
    expect((await guest().rpc('add_review_comment', { p_token: token, p_version: sent, p_name: 'Casey', p_body: 'x'.repeat(2001) })).data).toBe(false);
    expect((await guest().rpc('add_review_comment', { p_token: token, p_version: sentB, p_name: 'Casey', p_body: 'not on my link' })).data).toBe(false);
    expect((await guest().rpc('add_review_comment', { p_token: token, p_version: draft, p_name: 'Casey', p_body: 'a draft' })).data).toBe(false);
    for (const who of [cast.sam, cast.jordan]) {
      const rows = (await who.client.from('review_comments').select('guest_name, body').eq('version_id', sent)).data!;
      expect(rows).toEqual([{ guest_name: 'Casey (client)', body: 'Love the opening.' }]);
    }
    expect((await cast.riley.client.from('review_comments').select('id').eq('version_id', sent)).data).toEqual([]);
  });

  it('a team comment shows to the guest as the team', async () => {
    expect((await cast.sam.client.from('review_comments').insert({ version_id: sent, body: 'Thanks — tightening scene 2.' })).error).toBeNull();
    const body = (await guest().rpc('get_review', { p_token: token })).data as { versions: Array<{ comments: Array<{ from_team: boolean; body: string }> }> };
    expect(body.versions[0].comments.some((c) => c.from_team && c.body.startsWith('Thanks'))).toBe(true);
  });

  it('stops at 200 comments per link', async () => {
    const small = (await sam().from('review_links').insert({ project_id: projectId, version_ids: [sent] }).select('id, token').single()).data!;
    await admin().from('review_comments').insert(Array.from({ length: 199 }, (_, i) => ({ version_id: sent, link_id: small.id, guest_name: 'Bot', body: `c${i}` })));
    expect((await guest().rpc('add_review_comment', { p_token: small.token, p_version: sent, p_name: 'Casey', p_body: 'the 200th' })).data).toBe(true);
    expect((await guest().rpc('add_review_comment', { p_token: small.token, p_version: sent, p_name: 'Casey', p_body: 'the 201st' })).data).toBe(false);
  });

  it('a flood of comments is kept but tells the team at most 5 times in 10 minutes', async () => {
    const flood = (await sam().from('review_links').insert({ project_id: projectId, version_ids: [sent] }).select('id, token').single()).data!;
    await admin().from('notifications').delete().eq('user_id', cast.sam.id).eq('type', 'review');
    for (let i = 0; i < 8; i++) {
      expect((await guest().rpc('add_review_comment', { p_token: flood.token, p_version: sent, p_name: 'Bot', p_body: `spam ${i}` })).data).toBe(true);
    }
    const sequential = (await admin().from('notifications').select('id').eq('user_id', cast.sam.id).eq('type', 'review').like('title', 'New comment%')).data!;
    expect(sequential).toHaveLength(5);
    // A simultaneous burst can't slip past the count either (start from an empty quota).
    await admin().from('notifications').delete().eq('user_id', cast.sam.id).eq('type', 'review');
    const burst = await Promise.all(Array.from({ length: 6 }, (_, i) => guest().rpc('add_review_comment', { p_token: flood.token, p_version: sent, p_name: 'Bot', p_body: `burst ${i}` })));
    expect(burst.every((b) => b.data === true)).toBe(true);
    const told = (await admin().from('notifications').select('id').eq('user_id', cast.sam.id).eq('type', 'review').like('title', 'New comment%')).data!;
    expect(told).toHaveLength(5);
    expect((await admin().from('review_comments').select('id').eq('link_id', flood.id)).data).toHaveLength(14);
  });

  it('decides once for the team to confirm: the team is told, nothing is confirmed before a decision, and a confirmed decision is closed', async () => {
    // Nothing to confirm before the client decides.
    expect((await sam().from('item_versions').update({ confirmed_at: new Date().toISOString() }).eq('id', sent)).error).not.toBeNull();
    expect((await guest().rpc('decide_review', { p_token: token, p_version: sent, p_decision: 'maybe', p_name: 'Casey' })).data).toBe(false);
    expect((await guest().rpc('decide_review', { p_token: token, p_version: sent, p_decision: 'approved', p_name: '' })).data).toBe(false);
    expect((await guest().rpc('decide_review', { p_token: token, p_version: sent, p_decision: 'changes_requested', p_name: 'Casey', p_note: 'Shorter, please.' })).data).toBe(true);
    expect((await guest().rpc('decide_review', { p_token: token, p_version: sent, p_decision: 'approved', p_name: 'Casey' })).data).toBe(true);
    const v = (await sam().from('item_versions').select('guest_decision, guest_name, confirmed_at').eq('id', sent).single()).data!;
    expect(v).toMatchObject({ guest_decision: 'approved', guest_name: 'Casey', confirmed_at: null });
    const told = (await admin().from('notifications').select('title').eq('user_id', cast.sam.id).eq('type', 'review')).data!;
    expect(told.some((n) => n.title === 'Version 1 approved')).toBe(true);
    expect((await sam().from('item_versions').update({ confirmed_at: new Date().toISOString() }).eq('id', sent)).error).toBeNull();
    expect((await admin().from('item_versions').select('confirmed_by').eq('id', sent).single()).data!.confirmed_by).toBe(cast.sam.id);
    expect((await guest().rpc('decide_review', { p_token: token, p_version: sent, p_decision: 'changes_requested', p_name: 'Casey' })).data).toBe(false);
  });

  it('a guest on one link cannot touch another link\'s version', async () => {
    const other = (await sam().from('review_links').insert({ project_id: projectId, version_ids: [sentB] }).select('token').single()).data!;
    expect((await guest().rpc('decide_review', { p_token: other.token, p_version: sent, p_decision: 'approved', p_name: 'Eve' })).data).toBe(false);
    expect((await guest().rpc('get_review', { p_token: other.token })).data).not.toBeNull();
  });

  it('revoking the link ends access at once', async () => {
    expect((await sam().from('review_links').update({ revoked_at: new Date().toISOString() }).eq('id', linkId)).error).toBeNull();
    expect((await guest().rpc('get_review', { p_token: token })).data).toBeNull();
    expect((await guest().rpc('add_review_comment', { p_token: token, p_version: sent, p_name: 'Casey', p_body: 'still there?' })).data).toBe(false);
  });
});
