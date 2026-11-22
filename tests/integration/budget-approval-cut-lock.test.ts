import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// BACKLOG 3.52 (owner decisions 2026-11-22): the owner approves the budget with a button (the database takes who, when and what was
// approved), and the owner can lock a cut, which freezes it. Sam owns, Jordan is confirmed crew, Riley is an outsider.
let cast: Cast;
let projectId: string;
const progress = async () => ((await cast.sam.client.rpc('project_progress', { p_project: projectId })).data ?? {}) as Record<string, unknown>;
const project = (c: any) => c.from('projects').select('budget_approved_at, budget_approved_by, budget_approved_total, budget_approved_lines').eq('id', projectId).single();

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Approval and lock'));
});
afterAll(async () => { await destroyCast(cast); });

describe('budget approval', () => {
  it('the owner approves: the database stamps who, when and the figures, whatever the client sends', async () => {
    await cast.sam.client.from('budget_items').insert([
      { project_id: projectId, category: 'Camera', amount: 1000, created_by: cast.sam.id },
      { project_id: projectId, category: 'Sound', amount: 500, created_by: cast.sam.id },
    ]);
    expect((await progress()).budget_approved).toBe(false);
    const up = await cast.sam.client.from('projects').update({
      budget_approved_at: '2000-01-01T00:00:00Z', budget_approved_by: cast.riley.id, budget_approved_total: 1, budget_approved_lines: 99,
    }).eq('id', projectId);
    expect(up.error).toBeNull();
    const { data } = await project(cast.sam.client);
    expect(data.budget_approved_by).toBe(cast.sam.id);
    expect(Number(data.budget_approved_total)).toBe(1500);
    expect(data.budget_approved_lines).toBe(2);
    expect(new Date(data.budget_approved_at).getFullYear()).toBeGreaterThanOrEqual(2026);
    expect((await progress()).budget_approved).toBe(true);
  });

  it('an ordinary update cannot move the approval, and withdrawing it clears every figure', async () => {
    await cast.sam.client.from('projects').update({ budget_approved_total: 7, budget_approved_by: null, description: 'A harbour film.' }).eq('id', projectId);
    let { data } = await project(cast.sam.client);
    expect(Number(data.budget_approved_total)).toBe(1500);
    expect(data.budget_approved_by).toBe(cast.sam.id);
    await cast.sam.client.from('projects').update({ budget_approved_at: null }).eq('id', projectId);
    ({ data } = await project(cast.sam.client));
    expect(data).toEqual({ budget_approved_at: null, budget_approved_by: null, budget_approved_total: null, budget_approved_lines: null });
    expect((await progress()).budget_approved).toBe(false);
  });

  it('a project cannot be created already approved', async () => {
    const ins = await cast.sam.client.from('projects').insert({ title: 'Forged', creator_id: cast.sam.id, budget_approved_at: new Date().toISOString(), budget_approved_by: cast.riley.id, budget_approved_total: 5, budget_approved_lines: 9 }).select('id, budget_approved_at, budget_approved_by, budget_approved_total, budget_approved_lines').single();
    expect(ins.error).toBeNull();
    expect(ins.data).toMatchObject({ budget_approved_at: null, budget_approved_by: null, budget_approved_total: null, budget_approved_lines: null });
    await cast.sam.client.from('projects').delete().eq('id', ins.data!.id);
  });

  it('crew and outsiders cannot approve', async () => {
    await cast.jordan.client.from('projects').update({ budget_approved_at: new Date().toISOString() }).eq('id', projectId);
    expect((await project(cast.sam.client)).data.budget_approved_at).toBeNull();
    await cast.riley.client.from('projects').update({ budget_approved_at: new Date().toISOString() }).eq('id', projectId);
    expect((await project(cast.sam.client)).data.budget_approved_at).toBeNull();
    await anonClient().from('projects').update({ budget_approved_at: new Date().toISOString() }).eq('id', projectId);
    expect((await project(cast.sam.client)).data.budget_approved_at).toBeNull();
  });
});

describe('locking a cut', () => {
  let cutId: string;
  const cut = (c: any) => c.from('post_cuts');

  it('only the owner locks; the database stamps who and when', async () => {
    const ins = await cut(cast.sam.client).insert({ project_id: projectId, title: 'Assembly', url: 'https://example.com/a' }).select('id').single();
    expect(ins.error).toBeNull();
    cutId = ins.data.id;
    expect((await cut(cast.jordan.client).update({ locked_at: new Date().toISOString() }).eq('id', cutId)).error).not.toBeNull();
    const lock = await cut(cast.sam.client).update({ locked_at: '2000-01-01T00:00:00Z', locked_by: cast.riley.id }).eq('id', cutId);
    expect(lock.error).toBeNull();
    const { data } = await cut(cast.sam.client).select('locked_at, locked_by').eq('id', cutId).single();
    expect(data.locked_by).toBe(cast.sam.id);
    expect(new Date(data.locked_at).getFullYear()).toBeGreaterThanOrEqual(2026);
    expect((await progress()).cuts_locked).toBe(1);
  });

  it('a locked cut cannot be edited, deleted or given a new note, by anyone', async () => {
    for (const who of [cast.sam, cast.jordan]) {
      expect((await cut(who.client).update({ title: 'Changed' }).eq('id', cutId)).error).not.toBeNull();
      // RLS may filter a delete to nothing (no error) for crew; the owner's delete reaches the trigger and is refused. Either way it stays.
      await cut(who.client).delete().eq('id', cutId);
      expect((await cut(cast.sam.client).select('id').eq('id', cutId)).data).toHaveLength(1);
      expect((await who.client.from('post_notes').insert({ project_id: projectId, cut_id: cutId, at_seconds: 3, body: 'Too late' })).error).not.toBeNull();
    }
    expect((await cut(cast.sam.client).select('title').eq('id', cutId).single()).data.title).toBe('Assembly');
  });

  it('crew cannot unlock; the owner can, and the cut works again', async () => {
    await cut(cast.jordan.client).update({ locked_at: null }).eq('id', cutId);
    expect((await cut(cast.sam.client).select('locked_at').eq('id', cutId).single()).data.locked_at).not.toBeNull();
    expect((await cut(cast.sam.client).update({ locked_at: null }).eq('id', cutId)).error).toBeNull();
    const { data } = await cut(cast.sam.client).select('locked_at, locked_by').eq('id', cutId).single();
    expect(data).toEqual({ locked_at: null, locked_by: null });
    expect((await cast.sam.client.from('post_notes').insert({ project_id: projectId, cut_id: cutId, at_seconds: 3, body: 'Fine now' })).error).toBeNull();
    expect((await progress()).cuts_locked).toBe(0);
  });

  it('an outsider sees and changes nothing; deleting the project takes a locked cut with it', async () => {
    expect((await cut(cast.riley.client).select('id').eq('project_id', projectId)).data).toEqual([]);
    await cut(cast.sam.client).update({ locked_at: new Date().toISOString() }).eq('id', cutId);
    const del = await cast.sam.client.from('projects').delete().eq('id', projectId);
    expect(del.error).toBeNull();
    expect((await cut(cast.sam.client).select('id').eq('id', cutId)).data).toEqual([]);
  });
});

describe('the owner cannot delete a locked cut either', () => {
  it('the trigger refuses it with a message', async () => {
    const own = await createCast();
    try {
      const { projectId: pid } = await createCrewedProject(own, 'Lock delete');
      const ins = await own.sam.client.from('post_cuts').insert({ project_id: pid, title: 'Cut', url: 'https://example.com/c' }).select('id').single();
      await own.sam.client.from('post_cuts').update({ locked_at: new Date().toISOString() }).eq('id', ins.data!.id);
      const del = await own.sam.client.from('post_cuts').delete().eq('id', ins.data!.id);
      expect(del.error?.message).toContain('locked');
    } finally { await destroyCast(own); }
  });
});
