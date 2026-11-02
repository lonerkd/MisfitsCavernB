import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';
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
  await cast.sam.client.from('scenes').insert({ project_id: projectId, scene_number: 1, title: 'Scene 1', heading: 'INT. KITCHEN - NIGHT', cast_list: 'MAYA, BEN', shoot_day: 1 });
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
    await cast.sam.client.from('scenes').insert({ project_id: projectId, scene_number: 2, title: 'Scene 2', cast_list: 'IVY, LEO', shoot_day: 2 });
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
  it('prefers the links, and falls back to the text when a scene has none', () => {
    expect(sceneCast('X, Y', [{ characters: { name: 'ben' } }, { characters: { name: 'Ana' } }, { characters: { name: 'ben' } }])).toEqual(['ANA', 'BEN']);
    expect(sceneCast('maya, Ben ', [])).toEqual(['MAYA', 'BEN']);
    expect(sceneCast('MAYA, MAYA, BEN', [])).toEqual(['MAYA', 'BEN']); // each name once, in script order
    expect(sceneCast(null, null)).toEqual([]);
  });
});
