import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Casting decision history (4.15): owner shapes, crew reads, outsiders nothing.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Casting history'));
});
afterAll(async () => { await destroyCast(cast); });

const table = (c: any) => c.from('casting_history');

describe('casting history', () => {
  it('the owner writes and reads history', async () => {
    const { error } = await table(cast.sam.client).insert({ project_id: projectId, character_name: 'MAYA', action: 'cast', actor_id: cast.sam.id });
    expect(error).toBeNull();
    const { data } = await table(cast.sam.client).select('action').eq('project_id', projectId);
    expect(data).toHaveLength(1);
  });

  it('crew can read but not write', async () => {
    const { data } = await table(cast.jordan.client).select('action').eq('project_id', projectId);
    expect(data).toHaveLength(1);
    const { error } = await table(cast.jordan.client).insert({ project_id: projectId, character_name: 'MAYA', action: 'cast' });
    expect(error).not.toBeNull();
  });

  it('an outsider sees nothing and writes nothing; anon too', async () => {
    expect((await table(cast.riley.client).select('*').eq('project_id', projectId)).data).toEqual([]);
    expect((await table(cast.riley.client).insert({ project_id: projectId, character_name: 'MAYA', action: 'cast' })).error).not.toBeNull();
    expect((await table(anonClient()).select('*').eq('project_id', projectId)).data ?? []).toEqual([]);
  });
});
