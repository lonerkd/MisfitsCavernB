import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Casting notes (4.15): per character, per project. Owner writes, crew reads, outsiders nothing.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Casting notes'));
});
afterAll(async () => { await destroyCast(cast); });

const table = (c: any) => c.from('casting_notes');

describe('casting notes', () => {
  it('the owner writes and reads a note', async () => {
    const { error } = await table(cast.sam.client).insert({ project_id: projectId, character_name: 'MAYA', note: 'Try a softer read' });
    expect(error).toBeNull();
    const { data } = await table(cast.sam.client).select('note').eq('project_id', projectId);
    expect(data).toHaveLength(1);
  });

  it('crew can read but not write', async () => {
    const { data } = await table(cast.jordan.client).select('note').eq('project_id', projectId);
    expect(data).toHaveLength(1);
    const { error } = await table(cast.jordan.client).insert({ project_id: projectId, character_name: 'MAYA', note: 'hacked' });
    expect(error).not.toBeNull();
  });

  it('an outsider sees nothing and writes nothing; anon too', async () => {
    expect((await table(cast.riley.client).select('*').eq('project_id', projectId)).data).toEqual([]);
    expect((await table(cast.riley.client).insert({ project_id: projectId, character_name: 'MAYA', note: 'x' })).error).not.toBeNull();
    expect((await table(anonClient()).select('*').eq('project_id', projectId)).data ?? []).toEqual([]);
  });
});
