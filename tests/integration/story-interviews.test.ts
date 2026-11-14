import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// The story interview (3.25): answers are per project, shaped by the owner,
// read by the crew, invisible to outsiders.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Story interview'));
});
afterAll(async () => { await destroyCast(cast); });

const answers = { premise: 'A lighthouse keeper loses the sea', turningPoints: ['The storm', 'The return'] };
// The generated Supabase types lag a new migration; the RLS is what this test is about.
const table = (c: any) => c.from('story_interviews');

describe('story interview', () => {
  it('the owner writes and reads their answers', async () => {
    const { error } = await table(cast.sam.client)
      .upsert({ project_id: projectId, structure_id: 'three-act', answers });
    expect(error).toBeNull();
    const { data } = await table(cast.sam.client).select('structure_id, answers').eq('project_id', projectId).single();
    expect(data).toMatchObject({ structure_id: 'three-act', answers });
  });

  it('crew can read but not shape it', async () => {
    const { data } = await table(cast.jordan.client).select('answers').eq('project_id', projectId).single();
    expect(data?.answers).toMatchObject(answers);
    const { error } = await table(cast.jordan.client)
      .update({ answers: { premise: 'hacked' } }).eq('project_id', projectId);
    expect(error).not.toBeNull();
  });

  it('an outsider sees nothing and writes nothing; anon too', async () => {
    expect((await table(cast.riley.client).select('*').eq('project_id', projectId)).data).toEqual([]);
    expect((await table(cast.riley.client).insert({ project_id: projectId, answers })).error).not.toBeNull();
    expect((await table(anonClient()).select('*').eq('project_id', projectId)).data ?? []).toEqual([]);
  });

  it('one interview per project (upsert keeps one row)', async () => {
    await table(cast.sam.client).upsert({ project_id: projectId, structure_id: 'none', answers: {} });
    const { data } = await table(cast.sam.client).select('structure_id').eq('project_id', projectId);
    expect(data).toHaveLength(1);
    expect(data![0].structure_id).toBe('none');
  });
});
