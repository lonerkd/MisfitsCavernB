import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Signable paperwork: a guest with the exact link reads and signs with no account; the production's people create and read
// requests; nobody edits one in place; Riley (an outsider) and anon see nothing; a signed request marks its paperwork done.
let cast: Cast;
let projectId: string;
let docId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Signing'));
  const doc = await adminClient().from('project_documents').insert({ project_id: projectId, kind: 'release', title: 'Appearance release', status: 'pending' }).select('id').single();
  if (doc.error) throw doc.error;
  docId = doc.data.id;
});

afterAll(async () => {
  await destroyCast(cast);
});

const create = async (over: Record<string, unknown> = {}) => {
  const r = await cast.sam.client.from('signing_requests')
    .insert({ project_id: projectId, document_id: docId, title: 'Appearance release', body: 'I agree to appear.', signer_label: 'Maya Ortiz', created_by: cast.sam.id, ...over })
    .select('id, token').single();
  if (r.error) throw r.error;
  return r.data;
};

describe('signable paperwork', () => {
  it('lets the owner create and read a request; the guest reads it by the exact token with no login', async () => {
    const req = await create();
    expect(req.token.length).toBeGreaterThanOrEqual(64);
    const seen = await anonClient().rpc('get_signing', { p_token: req.token });
    expect(seen.error).toBeNull();
    expect(seen.data).toHaveLength(1);
    expect(seen.data![0]).toMatchObject({ title: 'Appearance release', body: 'I agree to appear.', project_title: 'Signing', status: 'pending', signed_name: null });
    expect((await anonClient().rpc('get_signing', { p_token: 'nope' })).data).toEqual([]);
    expect((await anonClient().rpc('get_signing', { p_token: req.token.slice(0, 40) })).data).toEqual([]);
  });

  it('signs once: needs the agreement and a real name, records the hash, marks the paperwork done and tells the owner', async () => {
    const req = await create();
    const guest = anonClient();
    expect((await guest.rpc('sign_document', { p_token: req.token, p_name: 'Maya Ortiz', p_agree: false })).data).toBe(false);
    expect((await guest.rpc('sign_document', { p_token: req.token, p_name: 'M', p_agree: true })).data).toBe(false);
    expect((await guest.rpc('sign_document', { p_token: req.token, p_name: 'Maya Ortiz', p_agree: true })).data).toBe(true);
    expect((await guest.rpc('sign_document', { p_token: req.token, p_name: 'Someone Else', p_agree: true })).data).toBe(false); // already signed
    const row = await cast.sam.client.from('signing_requests').select('status, signed_name, body_hash, signed_at').eq('id', req.id).single();
    expect(row.data).toMatchObject({ status: 'signed', signed_name: 'Maya Ortiz' });
    expect(row.data!.body_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.data!.signed_at).not.toBeNull();
    const doc = await cast.sam.client.from('project_documents').select('status').eq('id', docId).single();
    expect(doc.data!.status).toBe('done');
    const note = await cast.sam.client.from('notifications').select('title').eq('type', 'signing');
    expect((note.data ?? []).map((n) => n.title)).toContain('Appearance release signed');
    expect((await guest.rpc('get_signing', { p_token: req.token })).data![0]).toMatchObject({ status: 'signed', signed_name: 'Maya Ortiz' });
  });

  it('can be declined with a reason; then it cannot be signed', async () => {
    const req = await create();
    expect((await anonClient().rpc('decline_signing', { p_token: req.token, p_reason: 'Not at this rate' })).data).toBe(true);
    expect((await anonClient().rpc('sign_document', { p_token: req.token, p_name: 'Maya Ortiz', p_agree: true })).data).toBe(false);
    const row = await cast.sam.client.from('signing_requests').select('status, decline_reason').eq('id', req.id).single();
    expect(row.data).toMatchObject({ status: 'declined', decline_reason: 'Not at this rate' });
  });

  it('refuses an expired request and shows it as expired', async () => {
    const req = await create({ expires_at: new Date(Date.now() - 60_000).toISOString() });
    expect((await anonClient().rpc('get_signing', { p_token: req.token })).data![0].status).toBe('expired');
    expect((await anonClient().rpc('sign_document', { p_token: req.token, p_name: 'Maya Ortiz', p_agree: true })).data).toBe(false);
  });

  it('lets the production void a pending request, and nobody else', async () => {
    const req = await create();
    expect((await cast.riley.client.rpc('void_signing', { p_id: req.id })).data).toBe(false);
    expect((await anonClient().rpc('void_signing', { p_id: req.id })).error).not.toBeNull();
    expect((await cast.sam.client.rpc('void_signing', { p_id: req.id })).data).toBe(true);
    expect((await anonClient().rpc('sign_document', { p_token: req.token, p_name: 'Maya Ortiz', p_agree: true })).data).toBe(false);
    expect((await cast.sam.client.rpc('void_signing', { p_id: req.id })).data).toBe(false); // no longer pending
  });

  it('shows Riley and anon nothing, lets nobody edit or delete a request, and refuses forged inserts', async () => {
    const req = await create();
    expect((await cast.riley.client.from('signing_requests').select('id').eq('project_id', projectId)).data ?? []).toEqual([]);
    expect((await anonClient().from('signing_requests').select('id')).data ?? []).toEqual([]);
    const edit = await cast.sam.client.from('signing_requests').update({ body: 'I agree to pay Sam' }).eq('id', req.id).select('id');
    expect(edit.data ?? []).toEqual([]);
    const del = await cast.sam.client.from('signing_requests').delete().eq('id', req.id).select('id');
    expect(del.data ?? []).toEqual([]);
    const born = await cast.sam.client.from('signing_requests').insert({ project_id: projectId, title: 'x', body: 'y', status: 'signed', signed_name: 'Forged', created_by: cast.sam.id });
    expect(born.error).not.toBeNull();
    const outsider = await cast.riley.client.from('signing_requests').insert({ project_id: projectId, title: 'x', body: 'y', created_by: cast.riley.id });
    expect(outsider.error).not.toBeNull();
    // A request cannot point at another project's document.
    const other = await cast.riley.client.from('projects').insert({ title: 'Riley doc', creator_id: cast.riley.id }).select('id').single();
    const odoc = await adminClient().from('project_documents').insert({ project_id: other.data!.id, kind: 'release', title: 'Theirs' }).select('id').single();
    const cross = await cast.sam.client.from('signing_requests').insert({ project_id: projectId, document_id: odoc.data!.id, title: 'x', body: 'y', created_by: cast.sam.id });
    expect(cross.error).not.toBeNull();
  });
});
