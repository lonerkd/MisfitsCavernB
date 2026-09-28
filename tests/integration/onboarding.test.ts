import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// The projects board as personas: every card's progress in one call, only for
// projects the caller can see; only the owner shelves a project.
let cast: Cast;
let projectId: string;
let privateId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Board'));
  privateId = (await adminClient().from('projects')
    .insert({ title: 'Sam’s private one', creator_id: cast.sam.id, visibility: 'private', description: 'A logline long enough.' })
    .select('id').single()).data!.id;
});
afterAll(async () => { await destroyCast(cast); });

describe('projects_progress', () => {
  it('reads every visible project at once, keyed by id', async () => {
    const { data, error } = await cast.sam.client.rpc('projects_progress', { p_projects: [projectId, privateId] });
    expect(error).toBeNull();
    const byId = data as Record<string, Record<string, unknown>>;
    expect(Object.keys(byId).sort()).toEqual([projectId, privateId].sort());
    expect(byId[privateId]).toMatchObject({ logline: true, status: 'concept', scripts: 0 });
  });

  it('leaves out what the caller can’t see', async () => {
    expect((await cast.jordan.client.rpc('projects_progress', { p_projects: [projectId, privateId] })).data)
      .toEqual({ [projectId]: expect.any(Object) });
    expect((await cast.riley.client.rpc('projects_progress', { p_projects: [projectId, privateId] })).data).toEqual({});
    expect((await cast.sam.client.rpc('projects_progress', { p_projects: [] })).data).toEqual({});
  });
});

describe('archiving', () => {
  it('is the owner’s alone, and changes nothing else', async () => {
    const at = new Date().toISOString();
    // Crew and outsiders update nothing (the owner-only update policy).
    for (const who of [cast.jordan, cast.riley]) {
      const { data } = await who.client.from('projects').update({ archived_at: at }).eq('id', projectId).select('id');
      expect(data ?? []).toEqual([]);
    }
    const { data: mine } = await cast.sam.client.from('projects').update({ archived_at: at }).eq('id', projectId).select('archived_at');
    expect(mine?.[0]?.archived_at).not.toBeNull();
    // The crew still see it, and its progress.
    expect((await cast.jordan.client.from('projects').select('archived_at').eq('id', projectId).single()).data?.archived_at).not.toBeNull();
    expect((await cast.jordan.client.rpc('projects_progress', { p_projects: [projectId] })).data).toHaveProperty(projectId);
    // Restored.
    await cast.sam.client.from('projects').update({ archived_at: null }).eq('id', projectId);
    expect((await adminClient().from('projects').select('archived_at').eq('id', projectId).single()).data?.archived_at).toBeNull();
  });
});
