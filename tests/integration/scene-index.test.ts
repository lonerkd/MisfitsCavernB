import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, anonClient, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';
import { createStudioApi } from '@/lib/studio/api';
import { parseScript } from '@/lib/scriptos/parser';

// The scene index follows the screenplay, through the same data layer the app
// uses (lib/studio/api.ts) and the sync_script_scenes RPC, as real personas.
let cast: Cast;
let projectId: string;
let scriptId: string;

const V1 = 'INT. CAVE - NIGHT\n\nSam lights a match.\n\nSAM\nHello?\n\nEXT. ROAD - DAY\n\nA truck passes.\n';
const V2 = 'EXT. CLIFF - DAWN\n\nWind.\n\n' + V1;
const scenesOf = (text: string) => parseScript(text).scenes;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Scene Index'));
  scriptId = await createScript(cast, projectId, V1);
});

afterAll(async () => {
  await destroyCast(cast);
});

describe('syncing the scene index', () => {
  it('first sync creates one scene per heading, in order, with script-derived fields', async () => {
    const scenes = await createStudioApi(cast.sam.client).syncScriptScenes(scriptId, scenesOf(V1));
    expect(scenes.map((s) => [s.scene_number, s.heading])).toEqual([[1, 'INT. CAVE - NIGHT'], [2, 'EXT. ROAD - DAY']]);
    expect(scenes[0]).toMatchObject({ project_id: projectId, script_id: scriptId, cast_list: 'SAM', time_of_day: 'NIGHT', removed_at: null });
  });

  it('syncing an unchanged script writes nothing', async () => {
    const api = createStudioApi(cast.sam.client);
    const before = await api.listScenes(scriptId);
    const after = await api.syncScriptScenes(scriptId, scenesOf(V1));
    expect(after.map((s) => [s.id, s.updated_at])).toEqual(before.map((s) => [s.id, s.updated_at]));
  });

  it('the server also leaves unchanged rows untouched when handed a no-op plan', async () => {
    const api = createStudioApi(cast.sam.client);
    const before = await api.listScenes(scriptId);
    const { error } = await cast.sam.client.rpc('sync_script_scenes', {
      p_script_id: scriptId,
      p_base_ids: before.map((s) => s.id),
      p_scenes: before.map((s) => ({ id: s.id, heading: s.heading, location: s.location, time_of_day: s.time_of_day, cast_list: s.cast_list, est_duration: s.est_duration, elements: s.elements })),
    });
    expect(error).toBeNull();
    const after = await api.listScenes(scriptId);
    expect(after.map((s) => [s.id, s.updated_at])).toEqual(before.map((s) => [s.id, s.updated_at]));
  });

  it('crew can sync too, and a scene inserted at the top leaves the others’ ids alone', async () => {
    const api = createStudioApi(cast.jordan.client);
    const before = await api.listScenes(scriptId);
    const after = await api.syncScriptScenes(scriptId, scenesOf(V2));
    expect(after.map((s) => s.heading)).toEqual(['EXT. CLIFF - DAWN', 'INT. CAVE - NIGHT', 'EXT. ROAD - DAY']);
    expect(after.slice(1).map((s) => s.id)).toEqual(before.map((s) => s.id));
    expect(after.map((s) => s.scene_number)).toEqual([1, 2, 3]);
  });

  it('user-set fields (note, colour, shoot day, status) survive re-syncs', async () => {
    const api = createStudioApi(cast.sam.client);
    const [, cave] = await api.listScenes(scriptId);
    await api.updateScene(cave.id, { note: 'Practical fire only', color: '#d7340b', shoot_day: 3, status: 'shot' });
    const after = await api.syncScriptScenes(scriptId, scenesOf(V2.replace('A truck passes.', 'Two trucks pass.')));
    expect(after.find((s) => s.id === cave.id)).toMatchObject({ note: 'Practical fire only', color: '#d7340b', shoot_day: 3, status: 'shot' });
  });

  it('a stale plan is rejected (40001) instead of clobbering a newer index', async () => {
    const current = await createStudioApi(cast.sam.client).listScenes(scriptId);
    const { error } = await cast.sam.client.rpc('sync_script_scenes', {
      p_script_id: scriptId,
      p_base_ids: current.slice(1).map((s) => s.id),
      p_scenes: [],
    });
    expect(error?.code).toBe('40001');
    expect(await createStudioApi(cast.sam.client).listScenes(scriptId)).toHaveLength(current.length);
  });

  it('the outsider and anon cannot sync or read the index', async () => {
    await expect(createStudioApi(cast.riley.client).syncScriptScenes(scriptId, scenesOf(V1))).rejects.toThrow();
    expect(await createStudioApi(cast.riley.client).listScenes(scriptId)).toEqual([]);
    const { error } = await anonClient().rpc('sync_script_scenes', { p_script_id: scriptId, p_base_ids: [], p_scenes: [] });
    expect(error).not.toBeNull();
  });

  it('a plan cannot claim a scene that belongs to another script', async () => {
    const otherScript = await createScript(cast, projectId, 'INT. ELSEWHERE - DAY\n\nx\n');
    const [foreign] = await createStudioApi(cast.sam.client).syncScriptScenes(otherScript, scenesOf('INT. ELSEWHERE - DAY\n\nx\n'));
    const current = await createStudioApi(cast.sam.client).listScenes(scriptId);
    const { error } = await cast.sam.client.rpc('sync_script_scenes', {
      p_script_id: scriptId,
      p_base_ids: current.map((s) => s.id),
      p_scenes: [{ id: foreign.id, heading: 'HIJACK' }],
    });
    expect(error?.message).toMatch(/another script/);
  });

  it('keeps any time of day the heading uses (CONTINUOUS, LATER, MAGIC HOUR)', async () => {
    const text = 'INT. ROOM 12 - CONTINUOUS\n\nx\n\nEXT. ROOF - MAGIC HOUR\n\ny\n\nINT. ROOM 12 - LATER\n\nz\n';
    const other = await createScript(cast, projectId, text);
    const scenes = await createStudioApi(cast.sam.client).syncScriptScenes(other, scenesOf(text));
    expect(scenes.map((s) => s.heading)).toEqual(['INT. ROOM 12 - CONTINUOUS', 'EXT. ROOF - MAGIC HOUR', 'INT. ROOM 12 - LATER']);
  });

  it('scripts outside a project have no scene index', async () => {
    const loose = await createScript(cast, null, V1);
    await expect(createStudioApi(cast.sam.client).syncScriptScenes(loose, scenesOf(V1))).rejects.toThrow(/not part of a project/);
  });
});

describe('media linked to scenes', () => {
  it('owner and crew link library items to a scene and both see the links', async () => {
    const sam = createStudioApi(cast.sam.client);
    const jordan = createStudioApi(cast.jordan.client);
    const [, cave] = await sam.listScenes(scriptId);
    const still = await jordan.addLink(projectId, cast.jordan.id, { url: 'https://example.com/firelight.jpg' });
    const clip = await sam.addLink(projectId, cast.sam.id, { url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(still.kind).toBe('image');
    expect(clip.kind).toBe('video');

    await jordan.linkMedia(projectId, cast.jordan.id, cave.id, still.id);
    await sam.linkMedia(projectId, cast.sam.id, cave.id, clip.id);
    await sam.linkMedia(projectId, cast.sam.id, cave.id, clip.id); // idempotent

    for (const api of [sam, jordan]) {
      const links = (await api.listSceneMedia(projectId)).filter((l) => l.scene_id === cave.id);
      expect(links.map((l) => [l.media_id, l.position])).toEqual([[still.id, 0], [clip.id, 1]]);
    }
    expect(await createStudioApi(cast.riley.client).listSceneMedia(projectId)).toEqual([]);
  });

  it('cutting a scene keeps its links; pasting it back restores them', async () => {
    const api = createStudioApi(cast.sam.client);
    const cave = (await api.listScenes(scriptId)).find((s) => s.heading === 'INT. CAVE - NIGHT')!;
    const linksBefore = (await api.listSceneMedia(projectId)).filter((l) => l.scene_id === cave.id);
    expect(linksBefore.length).toBeGreaterThan(0);

    const without = await api.syncScriptScenes(scriptId, scenesOf('EXT. CLIFF - DAWN\n\nWind.\n\nEXT. ROAD - DAY\n\nA truck passes.\n'));
    expect(without.map((s) => s.heading)).toEqual(['EXT. CLIFF - DAWN', 'EXT. ROAD - DAY']);

    const back = await api.syncScriptScenes(scriptId, scenesOf(V2));
    expect(back.find((s) => s.heading === 'INT. CAVE - NIGHT')?.id).toBe(cave.id);
    const linksAfter = (await api.listSceneMedia(projectId)).filter((l) => l.scene_id === cave.id);
    expect(linksAfter.map((l) => l.media_id)).toEqual(linksBefore.map((l) => l.media_id));
  });

  it('a link can only join a scene and media from the same project', async () => {
    const other = await createCrewedProject(cast, 'Other Project');
    const api = createStudioApi(cast.sam.client);
    const foreignMedia = await api.addLink(other.projectId, cast.sam.id, { url: 'https://example.com/other.png' });
    const [scene] = await api.listScenes(scriptId);
    await expect(api.linkMedia(projectId, cast.sam.id, scene.id, foreignMedia.id)).rejects.toThrow();
    await expect(api.linkMedia(other.projectId, cast.sam.id, scene.id, foreignMedia.id)).rejects.toThrow();
  });

  it('deleting media removes its scene links', async () => {
    const api = createStudioApi(cast.sam.client);
    const [scene] = await api.listScenes(scriptId);
    const temp = await api.addLink(projectId, cast.sam.id, { url: 'https://example.com/temp.png' });
    await api.linkMedia(projectId, cast.sam.id, scene.id, temp.id);
    await api.deleteMedia(temp);
    expect((await api.listSceneMedia(projectId)).some((l) => l.media_id === temp.id)).toBe(false);
  });
});
