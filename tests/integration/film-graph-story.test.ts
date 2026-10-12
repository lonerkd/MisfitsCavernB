import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// The film graph, step 3: when in the story a scene happens, and how each
// character looks in it (continuity). As personas: Sam owns, Jordan is crew,
// Riley is outside.
let cast: Cast;
let projectId: string;
let otherProjectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Film graph story'));
  ({ projectId: otherProjectId } = await createCrewedProject(cast, 'Another film'));
});
afterAll(async () => { await destroyCast(cast); });

let n = 0;
async function addScene(extra: Record<string, unknown> = {}, project = projectId) {
  n += 1;
  const { data, error } = await cast.sam.client.from('scenes')
    .insert({ project_id: project, scene_number: n, title: `Scene ${n}`, cast_list: 'MAYA', ...extra })
    .select('id').single();
  if (error) throw error;
  return data.id;
}
const characterId = async (name: string, project = projectId) =>
  (await cast.sam.client.from('characters').select('id').eq('project_id', project).eq('name', name).single()).data!.id;

describe('story time', () => {
  it('a scene has a story day and a time, both optional, and the person’s word is kept', async () => {
    const s = await addScene();
    const none = (await cast.sam.client.from('scenes').select('story_day, story_time, story_confirmed').eq('id', s).single()).data!;
    expect(none).toEqual({ story_day: null, story_time: null, story_confirmed: false });
    const { error } = await cast.sam.client.from('scenes').update({ story_day: 3, story_time: 'dawn', story_confirmed: true }).eq('id', s);
    expect(error).toBeNull();
    const set = (await cast.sam.client.from('scenes').select('story_day, story_time, story_confirmed').eq('id', s).single()).data!;
    expect(set).toEqual({ story_day: 3, story_time: 'dawn', story_confirmed: true });
  });

  it('refuses a story day below 1 and a very long time', async () => {
    const s = await addScene();
    expect((await cast.sam.client.from('scenes').update({ story_day: 0 }).eq('id', s)).error).not.toBeNull();
    expect((await cast.sam.client.from('scenes').update({ story_time: 'x'.repeat(61) }).eq('id', s)).error).not.toBeNull();
  });
});

describe('continuity: how a character looks in a scene', () => {
  it('is one record per character per scene, and crew can write it', async () => {
    const s = await addScene();
    const id = await characterId('MAYA');
    const { error } = await cast.sam.client.from('scene_states').insert({ project_id: projectId, scene_id: s, character_id: id, look: 'Red coat, wet hair' });
    expect(error).toBeNull();
    expect((await cast.sam.client.from('scene_states').insert({ project_id: projectId, scene_id: s, character_id: id, look: 'dup' })).error).not.toBeNull();
    const { error: crewErr } = await cast.jordan.client.from('scene_states').update({ look: 'Red coat, dry hair', notes: 'Cut on the door' }).eq('scene_id', s).eq('character_id', id);
    expect(crewErr).toBeNull();
    const row = (await cast.sam.client.from('scene_states').select('look, notes').eq('scene_id', s).single()).data!;
    expect(row).toEqual({ look: 'Red coat, dry hair', notes: 'Cut on the door' });
  });

  it('goes with the scene', async () => {
    const s = await addScene({ cast_list: 'LEO' });
    const leo = await characterId('LEO');
    await cast.sam.client.from('scene_states').insert({ project_id: projectId, scene_id: s, character_id: leo, look: 'Suit' });
    await cast.sam.client.from('scenes').delete().eq('id', s);
    expect((await cast.sam.client.from('scene_states').select('scene_id').eq('character_id', leo)).data).toEqual([]);
  });

  it('can’t mix projects: a scene and a character must be in the same film', async () => {
    const a = await addScene();
    await addScene({}, otherProjectId);
    const other = await characterId('MAYA', otherProjectId);
    const { error } = await cast.sam.client.from('scene_states').insert({ project_id: projectId, scene_id: a, character_id: other, look: 'x' });
    expect(error).not.toBeNull();
  });

  it('an outsider sees nothing and writes nothing; anon too', async () => {
    const s = await addScene();
    const id = await characterId('MAYA');
    await cast.sam.client.from('scene_states').insert({ project_id: projectId, scene_id: s, character_id: id, look: 'Secret' });
    expect((await cast.riley.client.from('scene_states').select('look').eq('scene_id', s)).data).toEqual([]);
    expect((await cast.riley.client.from('scene_states').insert({ project_id: projectId, scene_id: s, character_id: id, look: 'x' })).error).not.toBeNull();
    const upd = await cast.riley.client.from('scene_states').update({ look: 'hacked' }).eq('scene_id', s).select();
    expect(upd.data ?? []).toEqual([]);
    expect((await anonClient().from('scene_states').select('look').eq('scene_id', s)).data ?? []).toEqual([]);
  });
});
