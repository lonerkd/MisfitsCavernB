import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// The film graph, step 2: who is in a scene is a set of links to characters,
// kept in step with the cast list text that older code still reads and writes.
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
async function addScene(cast_list: string | null, project = projectId) {
  n += 1;
  const { data, error } = await cast.sam.client.from('scenes')
    .insert({ project_id: project, scene_number: n, title: `Scene ${n}`, cast_list })
    .select('id').single();
  if (error) throw error;
  return data.id;
}
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

  it('follows an edit to the list, and a scene with nobody has nobody', async () => {
    const s = await addScene('MAYA, LEO');
    await cast.sam.client.from('scenes').update({ cast_list: 'LEO, ZED' }).eq('id', s);
    expect(await inScene(s)).toEqual(['LEO', 'ZED']);
    await cast.sam.client.from('scenes').update({ cast_list: null }).eq('id', s);
    expect(await inScene(s)).toEqual([]);
    expect(await character('ZED')).not.toBeNull();
  });

  it('keeps projects apart: the same name is a different character in another film', async () => {
    const a = await addScene('MAYA');
    const b = await addScene('MAYA', otherProjectId);
    const links = (await cast.sam.client.from('scene_characters').select('character_id, scene_id').in('scene_id', [a, b])).data!;
    expect(new Set(links.map((l) => l.character_id)).size).toBe(2);
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
    const scene = (await cast.sam.client.from('scenes').select('cast_list').eq('id', s).single()).data!;
    expect(scene.cast_list).toBe('IVY ROSE, LEO');
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
