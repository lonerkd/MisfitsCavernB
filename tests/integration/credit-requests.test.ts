import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { adminClient, createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Portfolio decision 4 (BACKLOG 3.44): a person left off a film's credits asks to be added and the owner decides. Sam owns, Jordan is
// crew, Riley is outside (and is the one asking).
let cast: Cast;
let projectId: string;
let requestId = '';

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Credit requests'));
});
afterAll(async () => { await destroyCast(cast); });

describe('asking to be credited', () => {
  it('a private project takes no requests', async () => {
    const r = await cast.riley.client.from('credit_requests').insert({ project_id: projectId, requester_id: cast.riley.id, craft: 'Gaffer' });
    expect(r.error).not.toBeNull();
  });

  it('once the project has a public page, an outsider can ask, once', async () => {
    await adminClient().from('projects').update({ visibility: 'link', share_token: randomUUID().replace(/-/g, '') }).eq('id', projectId);
    const r = await cast.riley.client.from('credit_requests').insert({ project_id: projectId, requester_id: cast.riley.id, craft: 'Gaffer', note: 'I rigged the night exteriors' }).select('id').single();
    expect(r.error).toBeNull();
    requestId = r.data!.id;
    const again = await cast.riley.client.from('credit_requests').insert({ project_id: projectId, requester_id: cast.riley.id, craft: 'Grip' });
    expect(again.error).not.toBeNull();
  });

  it('nobody can ask in someone else\'s name, and the crew and the owner do not ask', async () => {
    const forged = await cast.jordan.client.from('credit_requests').insert({ project_id: projectId, requester_id: cast.riley.id, craft: 'Boom' });
    expect(forged.error).not.toBeNull();
    const crew = await cast.jordan.client.from('credit_requests').insert({ project_id: projectId, requester_id: cast.jordan.id, craft: 'Boom' });
    expect(crew.error).not.toBeNull();
    const owner = await cast.sam.client.from('credit_requests').insert({ project_id: projectId, requester_id: cast.sam.id, craft: 'Boom' });
    expect(owner.error).not.toBeNull();
    expect((await anonClient().from('credit_requests').insert({ project_id: projectId, requester_id: cast.riley.id, craft: 'Boom' })).error).not.toBeNull();
  });
});

describe('finding the project from its share token', () => {
  it('a signed-in person with the token gets the id; a wrong token, a private project and anon get nothing', async () => {
    const token = (await adminClient().from('projects').select('share_token').eq('id', projectId).single()).data!.share_token as string;
    expect((await cast.riley.client.rpc('get_shared_project_id', { p_token: token })).data).toBe(projectId);
    expect((await cast.riley.client.rpc('get_shared_project_id', { p_token: 'nope' })).data).toBeNull();
    expect((await anonClient().rpc('get_shared_project_id', { p_token: token })).error).not.toBeNull();
  });
});

describe('who sees and who decides', () => {
  it('the owner and the requester see it; crew, others and anon do not', async () => {
    expect((await cast.sam.client.from('credit_requests').select('id').eq('id', requestId)).data).toHaveLength(1);
    expect((await cast.riley.client.from('credit_requests').select('id').eq('id', requestId)).data).toHaveLength(1);
    expect((await cast.jordan.client.from('credit_requests').select('id').eq('id', requestId)).data).toEqual([]);
    expect((await anonClient().from('credit_requests').select('id').eq('id', requestId)).data ?? []).toEqual([]);
  });

  it('only the owner answers, only the answer changes, and an answer is final', async () => {
    const byRequester = await cast.riley.client.from('credit_requests').update({ status: 'approved' }).eq('id', requestId).select('id');
    expect(byRequester.data ?? []).toEqual([]);
    const byCrew = await cast.jordan.client.from('credit_requests').update({ status: 'approved' }).eq('id', requestId).select('id');
    expect(byCrew.data ?? []).toEqual([]);
    const edit = await cast.sam.client.from('credit_requests').update({ craft: 'Director' }).eq('id', requestId);
    expect(edit.error).not.toBeNull();
    const ok = await cast.sam.client.from('credit_requests').update({ status: 'declined' }).eq('id', requestId).select('status, decided_at').single();
    expect(ok.error).toBeNull();
    expect(ok.data).toMatchObject({ status: 'declined' });
    expect(ok.data!.decided_at).not.toBeNull();
    const reverse = await cast.sam.client.from('credit_requests').update({ status: 'approved' }).eq('id', requestId);
    expect(reverse.error).not.toBeNull();
  });

  it('after an answer the person may ask again; a pending ask can be withdrawn only by them or the owner', async () => {
    const r = await cast.riley.client.from('credit_requests').insert({ project_id: projectId, requester_id: cast.riley.id, craft: 'Gaffer' }).select('id').single();
    expect(r.error).toBeNull();
    await cast.jordan.client.from('credit_requests').delete().eq('id', r.data!.id);
    expect((await adminClient().from('credit_requests').select('id').eq('id', r.data!.id)).data).toHaveLength(1);
    await cast.riley.client.from('credit_requests').delete().eq('id', r.data!.id);
    expect((await adminClient().from('credit_requests').select('id').eq('id', r.data!.id)).data).toEqual([]);
  });
});
