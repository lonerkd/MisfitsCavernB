import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject, linkCast } from './support/project';

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
async function addScene(extra: Record<string, unknown> = {}, project = projectId, names = ['MAYA']) {
  n += 1;
  const { data, error } = await cast.sam.client.from('scenes')
    .insert({ project_id: project, scene_number: n, title: `Scene ${n}`, ...extra })
    .select('id').single();
  if (error) throw error;
  await linkCast(cast.sam.client, project, data.id, names);
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
    const s = await addScene({}, projectId, ['LEO']);
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

describe('a look’s photo and elements', () => {
  const makeLook = async (project = projectId) => {
    const s = await addScene({}, project);
    const id = await characterId('MAYA', project);
    const { data, error } = await cast.sam.client.from('scene_states').insert({ project_id: project, scene_id: s, character_id: id, look: 'Red coat' }).select('id').single();
    if (error) throw error;
    return { state: data.id as string, scene: s };
  };
  const makeMedia = async (project = projectId) => {
    const { data, error } = await cast.sam.client.from('media').insert({ project_id: project, kind: 'image', title: 'Coat reference', external_url: 'https://example.com/coat.jpg' }).select('id').single();
    if (error) throw error;
    return data.id as string;
  };
  const makeElement = async (project = projectId, name = 'Red coat') => {
    const cat = (await cast.sam.client.from('breakdown_categories').select('id').eq('project_id', project).eq('key', 'wardrobe').single()).data!.id;
    const { data, error } = await cast.sam.client.from('breakdown_elements').insert({ project_id: project, category_id: cat, name }).select('id').single();
    if (error) throw error;
    return data.id as string;
  };

  it('a look takes a photo from the library; the photo going away clears the photo, not the look', async () => {
    const { state } = await makeLook();
    const photo = await makeMedia();
    expect((await cast.jordan.client.from('scene_states').update({ media_id: photo }).eq('id', state)).error).toBeNull();
    expect((await cast.sam.client.from('scene_states').select('media_id').eq('id', state).single()).data!.media_id).toBe(photo);
    await cast.sam.client.from('media').delete().eq('id', photo);
    const after = (await cast.sam.client.from('scene_states').select('look, media_id').eq('id', state).single()).data!;
    expect(after).toEqual({ look: 'Red coat', media_id: null });
  });

  it('a photo from another film is refused', async () => {
    const { state } = await makeLook();
    const foreign = await makeMedia(otherProjectId);
    expect((await cast.sam.client.from('scene_states').update({ media_id: foreign }).eq('id', state)).error).not.toBeNull();
  });

  it('a look is made of elements: crew attach and detach, the element going away takes the link, another film’s element is refused', async () => {
    const { state } = await makeLook();
    const coat = await makeElement();
    const link = await cast.jordan.client.from('scene_state_elements').insert({ state_id: state, element_id: coat, project_id: projectId });
    expect(link.error).toBeNull();
    expect((await cast.sam.client.from('scene_state_elements').select('element_id').eq('state_id', state)).data).toEqual([{ element_id: coat }]);
    const foreign = await makeElement(otherProjectId, 'Elsewhere coat');
    expect((await cast.sam.client.from('scene_state_elements').insert({ state_id: state, element_id: foreign, project_id: projectId })).error).not.toBeNull();
    await cast.sam.client.from('breakdown_elements').delete().eq('id', coat);
    expect((await cast.sam.client.from('scene_state_elements').select('element_id').eq('state_id', state)).data).toEqual([]);
  });

  it('the look going away takes its links; an outsider and anon see and write nothing', async () => {
    const { state, scene } = await makeLook();
    const coat = await makeElement(projectId, 'Hat');
    await cast.sam.client.from('scene_state_elements').insert({ state_id: state, element_id: coat, project_id: projectId });
    expect((await cast.riley.client.from('scene_state_elements').select('element_id').eq('state_id', state)).data).toEqual([]);
    expect((await cast.riley.client.from('scene_state_elements').insert({ state_id: state, element_id: coat, project_id: projectId })).error).not.toBeNull();
    expect((await cast.riley.client.from('scene_state_elements').delete().eq('state_id', state).select()).data ?? []).toEqual([]);
    expect((await anonClient().from('scene_state_elements').select('element_id').eq('state_id', state)).data ?? []).toEqual([]);
    await cast.sam.client.from('scenes').delete().eq('id', scene);
    expect((await cast.sam.client.from('scene_state_elements').select('element_id').eq('state_id', state)).data).toEqual([]);
  });
});
