import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';
import { createStudioApi } from '@/lib/studio/api';
import { parseScript } from '@/lib/scriptos/parser';

// Margin notes route to real work: a shot on the scene, a beat, a task.
let cast: Cast;
let projectId: string;
let scriptId: string;
let sceneIds: string[];

const TEXT = 'INT. CAVE - NIGHT\n\nSam lights a match.\n\nEXT. ROAD - DAY\n\nA truck passes.\n';

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Annotations'));
  scriptId = await createScript(cast, projectId, TEXT);
  sceneIds = (await createStudioApi(cast.sam.client).syncScriptScenes(scriptId, parseScript(TEXT).scenes)).map((s) => s.id);
});

afterAll(async () => {
  await destroyCast(cast);
});

const annotate = (who: Cast['sam'], type: string, text: string, scene?: [number, string]) =>
  who.client.rpc('add_script_annotation', {
    p_script: scriptId, p_line: 6, p_type: type, p_text: text,
    p_scene_ordinal: scene?.[0], p_scene_heading: scene?.[1],
  });

describe('margin notes route to real work', () => {
  it('a shot note adds a numbered shot to that scene', async () => {
    const a = await annotate(cast.jordan, 'shot', 'Wide on the truck', [1, 'EXT. ROAD - DAY']);
    expect(a.error).toBeNull();
    const b = await annotate(cast.jordan, 'shot', 'Insert: tyre', [1, 'EXT. ROAD - DAY']);
    expect(a.data).toMatchObject({ routed_table: 'shots', type: 'shot' });
    const { data: shots } = await cast.sam.client.from('shots').select('id, scene_id, shot_number, description').eq('scene_id', sceneIds[1]).order('order_index');
    expect(shots).toEqual([
      { id: a.data!.routed_id, scene_id: sceneIds[1], shot_number: '1', description: 'Wide on the truck' },
      { id: b.data!.routed_id, scene_id: sceneIds[1], shot_number: '2', description: 'Insert: tyre' },
    ]);
  });

  it('a shot note on a scene the saved script doesn’t have yet is refused, and nothing is written', async () => {
    const before = (await cast.sam.client.from('script_annotations').select('id').eq('script_id', scriptId)).data!.length;
    const r = await annotate(cast.jordan, 'shot', 'Crane up', [1, 'EXT. BRIDGE - DAY']);
    expect(r.error?.message).toMatch(/Save the script first/);
    expect((await cast.sam.client.from('script_annotations').select('id').eq('script_id', scriptId)).data).toHaveLength(before);
  });

  it('beat and to-do notes land on the beat board and the task list', async () => {
    const beat = await annotate(cast.jordan, 'beat', 'The match goes out', [0, 'INT. CAVE - NIGHT']);
    const todo = await annotate(cast.jordan, 'todo', 'Rent a truck');
    expect(beat.error).toBeNull();
    expect(todo.error).toBeNull();
    expect((await cast.sam.client.from('project_beats').select('title, scene_number').eq('id', beat.data!.routed_id!).single()).data)
      .toEqual({ title: 'The match goes out', scene_number: '1' });
    expect((await cast.sam.client.from('project_tasks').select('title').eq('id', todo.data!.routed_id!).single()).data)
      .toEqual({ title: 'Rent a truck' });
  });

  it('plain notes stay on the script', async () => {
    const n = await annotate(cast.jordan, 'note', 'Tighten this');
    expect(n.data).toMatchObject({ routed_table: null, routed_id: null });
  });

  it('outsiders can neither annotate nor create work through it', async () => {
    expect((await annotate(cast.riley, 'todo', 'spam')).error).not.toBeNull();
    expect((await cast.riley.client.from('shots').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await cast.sam.client.from('project_tasks').select('id').eq('project_id', projectId).eq('title', 'spam')).data).toEqual([]);
  });

  it('a shot can’t be pointed at another project’s scene', async () => {
    const { projectId: other } = await createCrewedProject(cast, 'Other');
    const { error } = await cast.sam.client.from('shots').insert({ project_id: other, scene_id: sceneIds[0], shot_number: '9' });
    expect(error).not.toBeNull();
  });
});

describe('the editor stash', () => {
  it('is shared with the project team and hidden from everyone else', async () => {
    const { data, error } = await cast.jordan.client.from('script_stash').insert({ script_id: scriptId, text: 'Alt line: "Who’s there?"' }).select('id, created_by').single();
    expect(error).toBeNull();
    expect(data!.created_by).toBe(cast.jordan.id);
    expect((await cast.sam.client.from('script_stash').select('text').eq('script_id', scriptId)).data).toEqual([{ text: 'Alt line: "Who’s there?"' }]);
    expect((await cast.riley.client.from('script_stash').select('id').eq('script_id', scriptId)).data).toEqual([]);
    expect((await cast.riley.client.from('script_stash').insert({ script_id: scriptId, text: 'x' })).error).not.toBeNull();
  });

  it('cannot be written in someone else’s name', async () => {
    const { error } = await cast.jordan.client.from('script_stash').insert({ script_id: scriptId, text: 'x', created_by: cast.sam.id });
    expect(error).not.toBeNull();
  });

  it('on a personal script, belongs to its author alone', async () => {
    const { data: s } = await cast.sam.client.from('scripts').insert({ title: 'Solo', content: '', created_by: cast.sam.id }).select('id').single();
    expect((await cast.sam.client.from('script_stash').insert({ script_id: s!.id, text: 'mine' })).error).toBeNull();
    expect((await cast.jordan.client.from('script_stash').select('id').eq('script_id', s!.id)).data).toEqual([]);
  });
});
