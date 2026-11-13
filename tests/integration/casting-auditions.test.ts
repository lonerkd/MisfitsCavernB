import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Casting auditions (4.15): owner shapes, crew reads, outsiders nothing.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Casting auditions'));
});
afterAll(async () => { await destroyCast(cast); });

const table = (c: any) => c.from('casting_auditions');

describe('casting auditions', () => {
  it('the owner schedules and reads an audition', async () => {
    const { error } = await table(cast.sam.client).insert({ project_id: projectId, character_name: 'MAYA', crew_user_id: cast.jordan.id, scheduled_at: '2026-11-20T14:00:00Z' });
    expect(error).toBeNull();
    const { data } = await table(cast.sam.client).select('scheduled_at').eq('project_id', projectId);
    expect(data).toHaveLength(1);
  });

  it('crew can read but not schedule', async () => {
    const { data } = await table(cast.jordan.client).select('scheduled_at').eq('project_id', projectId);
    expect(data).toHaveLength(1);
    const { error } = await table(cast.jordan.client).insert({ project_id: projectId, character_name: 'MAYA', crew_user_id: cast.jordan.id, scheduled_at: '2026-11-21T10:00:00Z' });
    expect(error).not.toBeNull();
  });

  it('an outsider sees nothing and writes nothing; anon too', async () => {
    expect((await table(cast.riley.client).select('*').eq('project_id', projectId)).data).toEqual([]);
    expect((await table(cast.riley.client).insert({ project_id: projectId, character_name: 'MAYA', crew_user_id: cast.jordan.id, scheduled_at: '2026-11-21T10:00:00Z' })).error).not.toBeNull();
    expect((await table(anonClient()).select('*').eq('project_id', projectId)).data ?? []).toEqual([]);
  });
});
