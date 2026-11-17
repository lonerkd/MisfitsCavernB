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
});

describe('sceneCast', () => {
  it('reads the links in name order, each once; a scene with none has no cast', () => {
    expect(sceneCast([{ characters: { name: 'ben' } }, { characters: { name: 'Ana' } }, { characters: { name: 'ben' } }])).toEqual(['ANA', 'BEN']);
    expect(sceneCast([])).toEqual([]);
    expect(sceneCast(null)).toEqual([]);
  });
});
