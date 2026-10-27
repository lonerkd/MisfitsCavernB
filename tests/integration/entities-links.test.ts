import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// The link layer (entities, links): an entity exists for each source row, kept
// by triggers; anyone on the project reads and attaches links; Riley (outside)
// reads and writes nothing; a link can't cross projects or dangle; the creator
// or someone who shapes the project removes it.
let cast: Cast;
let projectId: string;
let otherProject: string;
let sceneId: string;
let characterId: string;
let taskId: string;
let foreignTaskId: string;

const admin = () => adminClient();

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Link layer'));
  ({ projectId: otherProject } = await createCrewedProject(cast, 'Another project'));
  sceneId = (await admin().from('scenes').insert({ project_id: projectId, scene_number: 1, title: 'Opening', heading: 'INT. CAVE - NIGHT' }).select('id').single()).data!.id;
  characterId = (await admin().from('characters').insert({ project_id: projectId, name: 'MAYA' }).select('id').single()).data!.id;
  taskId = (await admin().from('project_tasks').insert({ project_id: projectId, title: 'Lock the cave' }).select('id').single()).data!.id;
  foreignTaskId = (await admin().from('project_tasks').insert({ project_id: otherProject, title: 'Elsewhere' }).select('id').single()).data!.id;
});
afterAll(async () => {
  await admin().from('projects').delete().in('id', [projectId, otherProject]);
  await destroyCast(cast);
});

const label = async (id: string) => (await admin().from('entities').select('label').eq('id', id).maybeSingle()).data?.label;

describe('entities follow their source rows', () => {
  it('one is created for each source row, labelled', async () => {
    expect(await label(sceneId)).toBe('1. INT. CAVE - NIGHT');
    expect(await label(characterId)).toBe('MAYA');
    expect(await label(taskId)).toBe('Lock the cave');
  });

  it('a rename changes the label; a delete removes the entity and its links', async () => {
    await admin().from('characters').update({ name: 'MAYA REYES' }).eq('id', characterId);
    expect(await label(characterId)).toBe('MAYA REYES');
    const temp = (await admin().from('project_tasks').insert({ project_id: projectId, title: 'Temporary' }).select('id').single()).data!.id;
    const link = await cast.sam.client.from('links').insert({ project_id: projectId, from_entity: temp, to_entity: sceneId }).select('id').single();
    expect(link.error).toBeNull();
    await admin().from('project_tasks').delete().eq('id', temp);
    expect(await label(temp)).toBeUndefined();
    expect((await admin().from('links').select('id').eq('id', link.data!.id)).data).toEqual([]);
  });

  it('nobody can write entities through the API', async () => {
    for (const who of [cast.sam, cast.jordan, cast.riley]) {
      expect((await who.client.from('entities').insert({ id: crypto.randomUUID(), project_id: projectId, kind: 'scene', label: 'x' })).error).not.toBeNull();
      await who.client.from('entities').update({ label: 'hijacked' }).eq('id', sceneId);
      await who.client.from('entities').delete().eq('id', sceneId);
    }
    expect(await label(sceneId)).toBe('1. INT. CAVE - NIGHT');
  });
});

describe('reading', () => {
  it('the owner and crew read entities and links; an outsider and anon read none', async () => {
    const made = await cast.sam.client.from('links').insert({ project_id: projectId, from_entity: taskId, to_entity: sceneId }).select('id').single();
    expect(made.error).toBeNull();
    for (const who of [cast.sam, cast.jordan]) {
      expect((await who.client.from('entities').select('id').eq('id', sceneId)).data).toHaveLength(1);
      expect((await who.client.from('links').select('id').eq('id', made.data!.id)).data).toHaveLength(1);
    }
    expect((await cast.riley.client.from('entities').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await cast.riley.client.from('links').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await anonClient().from('links').select('id')).data ?? []).toEqual([]);
  });
});

describe('writing links', () => {
  it('crew can attach; the link remembers who', async () => {
    const res = await cast.jordan.client.from('links').insert({ project_id: projectId, from_entity: characterId, to_entity: sceneId, kind: 'mentions' }).select('created_by').single();
    expect(res.error).toBeNull();
    expect(res.data!.created_by).toBe(cast.jordan.id);
  });

  it('an outsider cannot attach, nor claim someone else wrote it', async () => {
    expect((await cast.riley.client.from('links').insert({ project_id: projectId, from_entity: taskId, to_entity: characterId })).error).not.toBeNull();
    expect((await cast.jordan.client.from('links').insert({ project_id: projectId, from_entity: taskId, to_entity: characterId, created_by: cast.sam.id })).error).not.toBeNull();
  });

  it('a link cannot cross projects or point at itself or at nothing', async () => {
    expect((await cast.sam.client.from('links').insert({ project_id: projectId, from_entity: taskId, to_entity: foreignTaskId })).error).not.toBeNull();
    expect((await cast.sam.client.from('links').insert({ project_id: projectId, from_entity: taskId, to_entity: taskId })).error).not.toBeNull();
    expect((await cast.sam.client.from('links').insert({ project_id: projectId, from_entity: taskId, to_entity: crypto.randomUUID() })).error).not.toBeNull();
  });

  it('the same link twice is refused', async () => {
    const link = { project_id: projectId, from_entity: sceneId, to_entity: characterId };
    expect((await cast.sam.client.from('links').insert(link)).error).toBeNull();
    expect((await cast.sam.client.from('links').insert(link)).error).not.toBeNull();
  });

  it('the creator removes their own link; someone who shapes the project removes any; a viewer cannot remove others', async () => {
    // Jordan as a viewer: reads and attaches, but doesn't shape the project.
    await admin().from('project_crew').update({ role: 'viewer' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
    const mine = (await cast.jordan.client.from('links').insert({ project_id: projectId, from_entity: sceneId, to_entity: taskId, kind: 'for' }).select('id').single()).data!.id;
    const sams = (await cast.sam.client.from('links').insert({ project_id: projectId, from_entity: characterId, to_entity: taskId, kind: 'for' }).select('id').single()).data!.id;
    await cast.jordan.client.from('links').delete().eq('id', sams);
    expect((await admin().from('links').select('id').eq('id', sams)).data).toHaveLength(1);
    await cast.jordan.client.from('links').delete().eq('id', mine);
    expect((await admin().from('links').select('id').eq('id', mine)).data).toEqual([]);
    await cast.sam.client.from('links').delete().eq('id', sams);
    expect((await admin().from('links').select('id').eq('id', sams)).data).toEqual([]);
    await admin().from('project_crew').update({ role: 'contributor' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
  });
});
