import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// The deep brain, B8 continued: line overrides (shared with the project) and per-writer memory (private).
// Sam owns, Jordan is crew, Riley is outside.
let cast: Cast;
let projectId: string;
let otherProjectId: string;
let scriptId: string;
let otherScriptId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Overrides'));
  ({ projectId: otherProjectId } = await createCrewedProject(cast, 'Another film'));
  scriptId = (await cast.sam.client.from('scripts').insert({ title: 'S', content: 'x', project_id: projectId, created_by: cast.sam.id, last_edited_by: cast.sam.id }).select('id').single()).data!.id;
  otherScriptId = (await cast.sam.client.from('scripts').insert({ title: 'T', content: 'y', project_id: otherProjectId, created_by: cast.sam.id, last_edited_by: cast.sam.id }).select('id').single()).data!.id;
});
afterAll(async () => { await destroyCast(cast); });

const setOverride = (who: 'sam' | 'jordan' | 'riley', line: number, type = 'action', project = projectId, script = scriptId) =>
  cast[who].client.from('reading_line_overrides').insert({ project_id: project, script_id: script, line_index: line, forced_type: type }).select('id, forced_by').single();

describe('line overrides', () => {
  it('the owner and the crew can correct a line, and it records who', async () => {
    const a = await setOverride('sam', 3);
    expect(a.error).toBeNull();
    expect(a.data?.forced_by).toBe(cast.sam.id);
    expect((await setOverride('jordan', 4, 'dialogue')).error).toBeNull();
    const rows = (await cast.jordan.client.from('reading_line_overrides').select('line_index, forced_type').eq('script_id', scriptId).order('line_index')).data;
    expect(rows).toEqual([{ line_index: 3, forced_type: 'action' }, { line_index: 4, forced_type: 'dialogue' }]);
  });

  it('an outsider sees none and can write none', async () => {
    expect((await cast.riley.client.from('reading_line_overrides').select('id').eq('script_id', scriptId)).data).toEqual([]);
    expect((await setOverride('riley', 9)).error).not.toBeNull();
    const del = await cast.riley.client.from('reading_line_overrides').delete().eq('script_id', scriptId).select('id');
    expect(del.data ?? []).toEqual([]);
    expect((await cast.sam.client.from('reading_line_overrides').select('id').eq('script_id', scriptId)).data).toHaveLength(2);
  });

  it('one verdict per line; the type and index must be valid; the script must be in the project', async () => {
    expect((await setOverride('sam', 3)).error).not.toBeNull();
    expect((await setOverride('sam', 5, 'villain')).error).not.toBeNull();
    expect((await setOverride('sam', -1)).error).not.toBeNull();
    expect((await setOverride('sam', 6, 'action', projectId, otherScriptId)).error?.message).toMatch(/not in this project/);
  });
});

describe('per-writer memory', () => {
  it('a name verdict is remembered for the person who gave it, and only they can read it', async () => {
    expect((await cast.sam.client.from('reading_corrections').insert({ project_id: projectId, kind: 'not_character', name: 'NIGHT' })).error).toBeNull();
    expect((await cast.sam.client.from('reading_corrections').insert({ project_id: otherProjectId, kind: 'not_character', name: 'NIGHT' })).error).toBeNull();
    const mine = (await cast.sam.client.rpc('reading_memory_for_user', { p_user_id: cast.sam.id })).data as Array<{ kind: string; name: string; count: number }>;
    expect(mine).toEqual([expect.objectContaining({ kind: 'rejected_name', name: 'NIGHT', count: 2 })]);
    // Jordan asking for Sam's memory gets nothing: row security, not the argument, decides.
    expect((await cast.jordan.client.rpc('reading_memory_for_user', { p_user_id: cast.sam.id })).data).toEqual([]);
    expect((await cast.riley.client.from('reading_memory').select('id')).data).toEqual([]);
  });

  it('nobody writes into another person’s memory', async () => {
    const forged = await cast.jordan.client.from('reading_memory').insert({ user_id: cast.sam.id, kind: 'confirmed_name', name: 'FORGED' });
    expect(forged.error).not.toBeNull();
    const own = await cast.jordan.client.from('reading_memory').insert({ user_id: cast.jordan.id, kind: 'confirmed_name', name: 'MINE' });
    expect(own.error).toBeNull();
    expect((await cast.sam.client.from('reading_memory').select('name').eq('name', 'MINE')).data).toEqual([]);
  });
});
