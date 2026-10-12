import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// The safety net for renaming a character (the editor-on-the-graph plan, E0).
// The graph renames a character by id, and a trigger rewrites each scene's
// cast_list text to match. But the script's TEXT still says the old name, and
// the next script sync writes cast_list back from that text — undoing the
// rename and recreating the old character. No screen can rename a character
// yet, so nothing shows this today; it must be fixed (the rename rewrites the
// script text first — E4) before one can.
//
// `it.fails` passes while the bug exists and FAILS once it is fixed: then
// change it to `it` and keep it as the regression test.
let cast: Cast;
let projectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Film graph rename'));
});
afterAll(async () => { await destroyCast(cast); });

const inScene = async (sceneId: string) =>
  ((await cast.sam.client.from('scene_characters').select('characters(name)').eq('scene_id', sceneId)).data ?? [])
    .map((r) => (r.characters as unknown as { name: string }).name).sort();

describe('a character renamed in the graph', () => {
  it('is renamed in every scene, and the cast list text follows', async () => {
    const { data: scene } = await cast.sam.client.from('scenes')
      .insert({ project_id: projectId, scene_number: 1, title: 'Scene 1', cast_list: 'IVY, LEO' }).select('id').single();
    const ivy = (await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', 'IVY').single()).data!;
    expect((await cast.sam.client.from('characters').update({ name: 'IVY ROSE' }).eq('id', ivy.id)).error).toBeNull();
    expect((await cast.sam.client.from('scenes').select('cast_list').eq('id', scene!.id).single()).data!.cast_list).toBe('IVY ROSE, LEO');
    expect(await inScene(scene!.id)).toEqual(['IVY ROSE', 'LEO']);
  });

  it.fails('KNOWN GAP — stays renamed after the next script sync', async () => {
    const { data: scene } = await cast.sam.client.from('scenes')
      .insert({ project_id: projectId, scene_number: 2, title: 'Scene 2', cast_list: 'NORA' }).select('id').single();
    const nora = (await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', 'NORA').single()).data!;
    await cast.sam.client.from('characters').update({ name: 'NORA JAY' }).eq('id', nora.id);

    // What a script sync does: write cast_list from the script's text, which still says NORA.
    await cast.sam.client.from('scenes').update({ cast_list: 'NORA' }).eq('id', scene!.id);

    expect(await inScene(scene!.id)).toEqual(['NORA JAY']);
    expect((await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', 'NORA')).data).toEqual([]);
  });
});
