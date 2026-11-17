import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { randomUUID } from 'node:crypto';
import { createCrewedProject, createScript } from './support/project';

// The safety net for renaming a character (the editor-on-the-graph plan, E0).
// The graph renames a character by id and the scenes' links follow. But the
// script's TEXT still says the old name, and the next script sync links the
// scene from that text — undoing the rename and recreating the old character. No screen can rename a character
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

async function sync(script: string, id: string, n: number, cue: string, base: string[] = [id]) {
  const { error } = await cast.sam.client.rpc('sync_script_scenes', { p_script_id: script, p_base_ids: base, p_scenes: [{ id, heading: `Scene ${n}`, cast_list: cue }] });
  if (error) throw error;
}
async function syncedScene(n: number, cue: string) {
  const script = await createScript(cast, projectId);
  const id = randomUUID();
  await sync(script, id, n, cue, []);
  return { id, script };
}
const inScene = async (sceneId: string) =>
  ((await cast.sam.client.from('scene_characters').select('characters(name)').eq('scene_id', sceneId)).data ?? [])
    .map((r) => (r.characters as unknown as { name: string }).name).sort();

describe('a character renamed in the graph', () => {
  it('is renamed in every scene it is in', async () => {
    const scene = { id: (await syncedScene(1, 'IVY, LEO')).id };
    const ivy = (await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', 'IVY').single()).data!;
    expect((await cast.sam.client.from('characters').update({ name: 'IVY ROSE' }).eq('id', ivy.id)).error).toBeNull();
    expect(await inScene(scene!.id)).toEqual(['IVY ROSE', 'LEO']);
  });

  it.fails('KNOWN GAP — stays renamed after the next script sync', async () => {
    const made = await syncedScene(2, 'NORA');
    const scene = { id: made.id };
    const nora = (await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', 'NORA').single()).data!;
    await cast.sam.client.from('characters').update({ name: 'NORA JAY' }).eq('id', nora.id);

    // What a script sync does: link the scene from the script's text, which still says NORA.
    await sync(made.script, made.id, 2, 'NORA');

    expect(await inScene(scene!.id)).toEqual(['NORA JAY']);
    expect((await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', 'NORA')).data).toEqual([]);
  });
});
