import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

let cast: Cast;
let projectId: string;
let scriptId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Line overrides'));
  const { data, error } = await cast.sam.client
    .from('scripts')
    .insert({ project_id: projectId, title: 'Override test', content: '' })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('Could not create test script');
  scriptId = data.id;
});

afterAll(async () => { await destroyCast(cast); });

const add = (who: 'sam' | 'jordan' | 'riley', lineType: string, occurrence = 0) =>
  cast[who].client.from('script_line_overrides')
    .insert({ script_id: scriptId, line_text: 'DARKNESS', occurrence, line_type: lineType })
    .select('id, script_id, line_text, occurrence, line_type, created_by')
    .single();

describe('script line overrides', () => {
  it('the owner and crew can save a correction for the same script', async () => {
    const owner = await add('sam', 'character');
    expect(owner.error).toBeNull();
    expect(owner.data).toMatchObject({ script_id: scriptId, line_text: 'DARKNESS', occurrence: 0, line_type: 'character', created_by: cast.sam.id });
    const crew = await add('jordan', 'action', 1);
    expect(crew.error).toBeNull();
    expect(crew.data?.created_by).toBe(cast.jordan.id);
    expect((await cast.sam.client.from('script_line_overrides').select('line_type').eq('script_id', scriptId)).data).toHaveLength(2);
  });

  it('one override is stored per exact text occurrence and the type is constrained', async () => {
    expect((await add('sam', 'action')).error).not.toBeNull();
    expect((await add('sam', 'not_a_line_type', 2)).error).not.toBeNull();
    expect((await add('sam', 'dialogue', -1)).error).not.toBeNull();
    expect((await cast.sam.client.from('script_line_overrides').insert({
      script_id: scriptId, line_text: ' padded ', occurrence: 3, line_type: 'dialogue',
    })).error).not.toBeNull();
  });

  it('an outsider and anon cannot see or change another script’s corrections', async () => {
    expect((await cast.riley.client.from('script_line_overrides').select('id').eq('script_id', scriptId)).data).toEqual([]);
    expect((await add('riley', 'action', 4)).error).not.toBeNull();
    expect((await anonClient().from('script_line_overrides').select('id').eq('script_id', scriptId)).data ?? []).toEqual([]);
    const { data, error } = await cast.sam.client.from('script_line_overrides').select('id').eq('script_id', scriptId);
    expect(error).toBeNull();
    expect(data?.length).toBe(2);
  });
});
