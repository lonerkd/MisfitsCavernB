import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, addSceneWithCast } from './support/project';
import { createStudioApi, sceneCast } from '@/lib/studio/api';

// The call sheet the crew open (`/call/[id]`) reads who is in each scene, and which characters the viewer plays,
// through the film graph (the linked characters), not the older text columns. Sam writes, Jordan is cast and
// reads the sheet, Riley is an outsider.
let cast: Cast;
let projectId: string;
let sheetId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Call sheet view'));
  await addSceneWithCast(cast.sam.client, projectId, { scene_number: 1, title: 'Scene 1', heading: 'INT. KITCHEN - NIGHT', shoot_day: 1 }, ['MAYA', 'BEN']);
  sheetId = (await cast.sam.client.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_date: '2026-12-01' }).select('id').single()).data!.id;
  await cast.sam.client.from('character_castings').insert({ project_id: projectId, character_name: 'MAYA', crew_user_id: cast.jordan.id, created_by: cast.sam.id });
});
afterAll(async () => { await destroyCast(cast); });

describe('getCallSheetView', () => {
  it('shows a scene’s cast from the linked characters (in name order) and the viewer’s own characters', async () => {
    const view = await createStudioApi(cast.jordan.client).getCallSheetView(sheetId, cast.jordan.id);
    expect(view?.scenes).toHaveLength(1);
    expect(view!.scenes[0].cast).toEqual(['BEN', 'MAYA']);
    expect(view!.castAs).toEqual(['MAYA']);
  });

  it('follows a character through a rename (its own scene and character, so it does not lean on the test above)', async () => {
    const sheet = (await cast.sam.client.from('call_sheets').insert({ project_id: projectId, shoot_day: 2, shoot_date: '2026-12-02' }).select('id').single()).data!.id;
    await addSceneWithCast(cast.sam.client, projectId, { scene_number: 2, title: 'Scene 2', shoot_day: 2 }, ['IVY', 'LEO']);
    await cast.sam.client.from('character_castings').insert({ project_id: projectId, character_name: 'IVY', crew_user_id: cast.jordan.id, created_by: cast.sam.id });
    const ivy = (await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', 'IVY').single()).data!.id;
    expect((await cast.sam.client.from('characters').update({ name: 'IVY ROSE' }).eq('id', ivy)).error).toBeNull();
    const view = await createStudioApi(cast.jordan.client).getCallSheetView(sheet, cast.jordan.id);
    expect(view!.scenes[0].cast).toEqual(['IVY ROSE', 'LEO']);
    expect(view!.castAs).toContain('IVY ROSE');
  });

  it('shows an outsider nothing', async () => {
    expect(await createStudioApi(cast.riley.client).getCallSheetView(sheetId, cast.riley.id)).toBeNull();
  });

  it('shows a scene’s place as its linked location’s current name, not the heading text it was filed under', async () => {
    const sheet = (await cast.sam.client.from('call_sheets').insert({ project_id: projectId, shoot_day: 4, shoot_date: '2026-12-04' }).select('id').single()).data!.id;
    await addSceneWithCast(cast.sam.client, projectId, { scene_number: 4, title: 'Scene 4', location: 'HARBOR', shoot_day: 4 }, []);
    // The insert linked the scene to a location record named HARBOR; renaming the record is the divergence:
    // the scene's text still says HARBOR, the crew should see the place's current name.
    const place = (await cast.sam.client.from('project_locations').select('id').eq('project_id', projectId).eq('name', 'HARBOR').single()).data!;
    expect((await cast.sam.client.from('project_locations').update({ name: 'DOCK OFFICE' }).eq('id', place.id)).error).toBeNull();
    const view = await createStudioApi(cast.jordan.client).getCallSheetView(sheet, cast.jordan.id);
    expect(view!.scenes).toHaveLength(1);
    expect(view!.scenes[0].location).toBe('DOCK OFFICE');
  });

  it('saves a cast call by character id, with the name kept as its label', async () => {
    const maya = (await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', 'MAYA').single()).data!;
    const api = createStudioApi(cast.sam.client);
    const sheet = (await api.listCallSheets(projectId)).find((s) => s.id === sheetId)!;
    const row = await api.saveCall(sheet, { character_id: maya.id, character_name: 'MAYA' }, undefined, { call_time: '06:30', remarks: null });
    expect(row?.character_id).toBe(maya.id);
    expect(row?.character_name).toBe('MAYA');
  });
});

describe('sceneCast', () => {
  it('reads the links in name order, each once; a scene with none has no cast', () => {
    expect(sceneCast([{ characters: { name: 'ben' } }, { characters: { name: 'Ana' } }, { characters: { name: 'ben' } }])).toEqual(['ANA', 'BEN']);
    expect(sceneCast([])).toEqual([]);
    expect(sceneCast(null)).toEqual([]);
  });
});
