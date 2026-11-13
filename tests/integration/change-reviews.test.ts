import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';

// Change review (4.12): owner accepts/rejects, crew reads, outsiders nothing.
let cast: Cast;
let projectId: string;
let scriptId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Change review'));
  scriptId = await createScript(cast, projectId, 'INT. CAVE - NIGHT\n\nHello.\n');
});
afterAll(async () => { await destroyCast(cast); });

const table = (c: any) => c.from('change_reviews');

describe('change reviews', () => {
  it('the owner writes and reads a decision', async () => {
    const { error } = await table(cast.sam.client).upsert({ project_id: projectId, script_id: scriptId, change_key: 'abc', kind: 'accept' });
    expect(error).toBeNull();
    const { data } = await table(cast.sam.client).select('kind').eq('project_id', projectId).eq('script_id', scriptId);
    expect(data).toHaveLength(1);
  });

  it('one decision per change (upsert)', async () => {
    await table(cast.sam.client).upsert({ project_id: projectId, script_id: scriptId, change_key: 'abc', kind: 'reject' });
    const { data } = await table(cast.sam.client).select('kind').eq('project_id', projectId).eq('script_id', scriptId);
    expect(data).toHaveLength(1);
    expect(data![0].kind).toBe('reject');
  });

  it('crew can read but not write', async () => {
    const { data } = await table(cast.jordan.client).select('kind').eq('project_id', projectId).eq('script_id', scriptId);
    expect(data).toHaveLength(1);
    const { error } = await table(cast.jordan.client).upsert({ project_id: projectId, script_id: scriptId, change_key: 'x', kind: 'accept' });
    expect(error).not.toBeNull();
  });

  it('an outsider sees nothing and writes nothing; anon too', async () => {
    expect((await table(cast.riley.client).select('*').eq('project_id', projectId)).data).toEqual([]);
    expect((await table(cast.riley.client).upsert({ project_id: projectId, script_id: scriptId, change_key: 'x', kind: 'accept' })).error).not.toBeNull();
    expect((await table(anonClient()).select('*').eq('project_id', projectId)).data ?? []).toEqual([]);
  });
});
