import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';

// The film graph, step 2: who is in a scene is a set of links to characters. The script's cast cue becomes those links when
// the script's scenes are synced (sync_script_scenes, the one writer; scenes.cast_list is gone, 2026-11-17).
// As personas: Sam owns, Jordan is crew, Riley is outside.
let cast: Cast;
let projectId: string;
let otherProjectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Film graph people'));
  ({ projectId: otherProjectId } = await createCrewedProject(cast, 'Another film'));
});
afterAll(async () => { await destroyCast(cast); });

let n = 0;
/** Sync one scene with a cast cue the way the app does: through its own script, as Sam. Pass `scene` to change the same scene's cue. */
async function syncCue(cue: string | null, project = projectId, scene?: { id: string; script: string }) {
  n += 1;
  const script = scene?.script ?? (await createScript(cast, project));
  const id = scene?.id ?? randomUUID();
  const { error } = await cast.sam.client.rpc('sync_script_scenes', {
    p_script_id: script,
    p_base_ids: scene ? [id] : [],
    p_scenes: [{ id, heading: `Scene ${n}`, cast_list: cue }],
  });
  if (error) throw error;
  return { id, script };
}
const addScene = async (cue: string | null, project = projectId) => (await syncCue(cue, project)).id;
const inScene = async (sceneId: string) =>
  ((await cast.sam.client.from('scene_characters').select('characters(name)').eq('scene_id', sceneId)).data ?? [])
    .map((r) => (r.characters as unknown as { name: string }).name).sort();
const character = async (name: string, project = projectId) =>
  (await cast.sam.client.from('characters').select('id, name').eq('project_id', project).eq('name', name).maybeSingle()).data;

describe('who is in a scene', () => {
  it('becomes characters and links, whatever the case or spacing', async () => {
    const s = await addScene(' maya,Leo , MAYA ');
    expect(await inScene(s)).toEqual(['LEO', 'MAYA']);
    expect((await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', 'MAYA')).data).toHaveLength(1);
  });

  it('follows an edit to the cue, and a scene with nobody has nobody', async () => {
    const first = await syncCue('MAYA, LEO');
    await syncCue('LEO, ZED', projectId, first);
    expect(await inScene(first.id)).toEqual(['LEO', 'ZED']);
    await syncCue(null, projectId, first);
    expect(await inScene(first.id)).toEqual([]);
    expect(await character('ZED')).not.toBeNull();
  });

  it('keeps projects apart: the same name is a different character in another film', async () => {
    const a = await addScene('MAYA');
    const b = await addScene('MAYA', otherProjectId);
    const links = (await cast.sam.client.from('scene_characters').select('character_id, scene_id').in('scene_id', [a, b])).data!;
    expect(new Set(links.map((l) => l.character_id)).size).toBe(2);
  });

  it('stores no cast text on the scene: the column is gone', async () => {
    const s = await addScene('MAYA');
    const { error } = await cast.sam.client.from('scenes').select('cast_list' as never).eq('id', s).single();
    expect(error).not.toBeNull();
  });
});

describe('who plays whom', () => {
  it('is of a character, and survives a rename of that character', async () => {
    const s = await addScene('IVY, LEO');
    const { data: made, error } = await cast.sam.client.from('character_castings')
      .insert({ project_id: projectId, character_name: 'ivy', crew_user_id: cast.jordan.id }).select('id, character_id').single();
    if (error) throw error;
    const ivy = await character('IVY');
    expect(made.character_id).toBe(ivy!.id);

    const { error: renameError } = await cast.sam.client.from('characters').update({ name: 'IVY ROSE' }).eq('id', ivy!.id);
    expect(renameError).toBeNull();
    const casting = (await cast.sam.client.from('character_castings').select('character_name, character_id').eq('id', made.id).single()).data!;
    expect(casting).toEqual({ character_name: 'IVY ROSE', character_id: ivy!.id });
    expect(await inScene(s)).toEqual(['IVY ROSE', 'LEO']);
  });
});

describe('who can see it', () => {
  it('the crew can; an outsider cannot, and cannot add to it', async () => {
    const s = await addScene('PRIVATE ONE');
    expect((await cast.jordan.client.from('scene_characters').select('scene_id').eq('scene_id', s)).data).toHaveLength(1);
    expect((await cast.riley.client.from('scene_characters').select('scene_id').eq('scene_id', s)).data).toEqual([]);
    expect((await cast.riley.client.from('characters').select('id').eq('project_id', projectId)).data).toEqual([]);
    const { error } = await cast.riley.client.from('characters').insert({ project_id: projectId, name: 'INTRUDER' });
    expect(error).not.toBeNull();
  });
});
