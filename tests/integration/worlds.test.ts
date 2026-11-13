import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// World building (4.11): one stored world per project. Owner writes, crew reads, outsiders nothing.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'World building'));
});
afterAll(async () => { await destroyCast(cast); });

const table = (c: any) => c.from('worlds');

describe('worlds', () => {
  it('the owner writes and reads the world', async () => {
    const { error } = await table(cast.sam.client).upsert({ project_id: projectId, locations: [{ id: '1', name: 'Cave' }], lore: [], rules: [], timeline: [] });
    expect(error).toBeNull();
    const { data } = await table(cast.sam.client).select('locations').eq('project_id', projectId).single();
    expect(data.locations).toHaveLength(1);
  });

  it('crew can read but not shape it', async () => {
    const { data } = await table(cast.jordan.client).select('locations').eq('project_id', projectId).single();
    expect(data.locations).toHaveLength(1);
    const { error } = await table(cast.jordan.client).update({ locations: [] }).eq('project_id', projectId);
    expect(error).not.toBeNull();
  });

  it('an outsider sees nothing and writes nothing; anon too', async () => {
    expect((await table(cast.riley.client).select('*').eq('project_id', projectId)).data).toEqual([]);
    expect((await table(cast.riley.client).insert({ project_id: projectId })).error).not.toBeNull();
    expect((await table(anonClient()).select('*').eq('project_id', projectId)).data ?? []).toEqual([]);
  });
});
