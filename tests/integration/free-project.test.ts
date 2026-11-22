import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, destroyCast, anonClient, type Cast } from './support/personas';

// BACKLOG 3.54: the Notes format has no phases. The format row says so (phased = false), project_progress returns the flag with the rest of
// the rules, and a project in that format is an ordinary project to its owner, its crew and an outsider.
let cast: Cast;
let projectId: string;
beforeAll(async () => {
  cast = await createCast();
  const p = await cast.sam.client.from('projects').insert({ title: 'Loose notes', creator_id: cast.sam.id, project_type: 'Notes' }).select('id').single();
  if (p.error) throw p.error;
  projectId = p.data.id;
});
afterAll(async () => { await destroyCast(cast); });

describe('the Notes format', () => {
  it('is in the formats list, unphased, and every other format is phased', async () => {
    const { data } = await anonClient().from('project_formats').select('name, phased').order('position');
    expect(data?.find((f) => f.name === 'Notes')?.phased).toBe(false);
    expect((data ?? []).filter((f) => f.name !== 'Notes').every((f) => f.phased === true)).toBe(true);
  });

  it('project_progress carries the flag in the format rules', async () => {
    const { data } = await cast.sam.client.rpc('project_progress', { p_project: projectId });
    const format = (data as { format: { phased: boolean } }).format;
    expect(format.phased).toBe(false);
  });

  it('only an admin can add or change formats', async () => {
    expect((await cast.sam.client.from('project_formats').update({ phased: true }).eq('name', 'Notes')).error ?? null).toBeNull(); // filtered to nothing, no error
    const { data } = await adminClient().from('project_formats').select('phased').eq('name', 'Notes').single();
    expect(data?.phased).toBe(false);
    expect((await cast.sam.client.from('project_formats').insert({ name: 'Mine', phased: false })).error).not.toBeNull();
  });

  it('the project is as private as any other: crew see it only when confirmed, an outsider never', async () => {
    expect((await cast.riley.client.from('projects').select('id').eq('id', projectId)).data).toEqual([]);
    expect((await cast.jordan.client.from('projects').select('id').eq('id', projectId)).data).toEqual([]);
  });
});
