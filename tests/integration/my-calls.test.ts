import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, addSceneWithCast } from './support/project';
import { createStudioApi } from '@/lib/studio/api';

// A performer's own list of calls ("My calls"): every issued call sheet on the productions they belong to, with the call they
// have on each. Sam owns and issues, Jordan is an actor cast as MAYA, Riley is an outsider.
let cast: Cast;
let projectId: string;
let issuedId: string;
let draftId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'My calls'));
  const sam = cast.sam.client;
  await sam.from('project_crew').update({ craft: 'Actor' }).eq('project_id', projectId).eq('user_id', cast.jordan.id);
  await sam.from('character_castings').insert({ project_id: projectId, character_name: 'MAYA', crew_user_id: cast.jordan.id, created_by: cast.sam.id });
  await addSceneWithCast(sam, projectId, { scene_number: 1, title: 'Scene 1', heading: 'INT. KITCHEN - DAY', shoot_day: 1 }, ['MAYA', 'BEN']);
  issuedId = (await sam.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, shoot_date: '2026-12-01', general_call: '07:00', location_address: '12 Pier Rd' }).select('id').single()).data!.id;
  draftId = (await sam.from('call_sheets').insert({ project_id: projectId, shoot_day: 2, shoot_date: '2026-12-02', general_call: '08:00' }).select('id').single()).data!.id;
  // Maya's own call, then issue day 1; day 2 stays a draft.
  const call = await sam.from('call_sheet_calls').insert({ call_sheet_id: issuedId, project_id: projectId, character_name: 'MAYA', call_time: '06:30:00', remarks: 'Hair and makeup first' });
  expect(call.error).toBeNull();
  const issued = await createStudioApi(sam).issueCallSheet(issuedId);
  expect(issued.version).toBe(1);
});
afterAll(async () => { await destroyCast(cast); });

describe('listMyCalls', () => {
  it('shows a performer the issued sheets of their production with their own call, not the general one', async () => {
    const mine = await createStudioApi(cast.jordan.client).listMyCalls(cast.jordan.id);
    expect(mine).toHaveLength(1);
    expect(mine[0].project).toEqual({ id: projectId, title: 'My calls' });
    expect(mine[0].sheet.shoot_day).toBe(1);
    expect(mine[0].mine).toMatchObject({ call_time: '06:30:00', remarks: 'Hair and makeup first', as: 'MAYA' });
    expect(mine[0].acked).toBeNull();
  });

  it('leaves out a draft: nobody is told about a sheet that has not been issued', async () => {
    const mine = await createStudioApi(cast.jordan.client).listMyCalls(cast.jordan.id);
    expect(mine.map((m) => m.sheet.id)).not.toContain(draftId);
  });

  it('says whether they have confirmed the version', async () => {
    await createStudioApi(cast.jordan.client).ackCallSheet(issuedId);
    const mine = await createStudioApi(cast.jordan.client).listMyCalls(cast.jordan.id);
    expect(mine[0].acked).toBe(1);
  });

  it('gives crew with no call of their own the sheet with no call (the general call applies)', async () => {
    const mine = await createStudioApi(cast.sam.client).listMyCalls(cast.sam.id);
    expect(mine.find((m) => m.sheet.id === issuedId)?.mine).toBeNull();
  });

  it('shows an outsider nothing', async () => {
    expect(await createStudioApi(cast.riley.client).listMyCalls(cast.riley.id)).toEqual([]);
  });

  it('shows a person only their own production\'s sheets: a second production Jordan is not on does not appear', async () => {
    const other = await cast.sam.client.from('projects').insert({ title: 'Not Jordan', creator_id: cast.sam.id }).select('id').single();
    const sheet = await cast.sam.client.from('call_sheets').insert({ project_id: other.data!.id, shoot_day: 1, shoot_date: '2026-12-03' }).select('id').single();
    await createStudioApi(cast.sam.client).issueCallSheet(sheet.data!.id);
    const mine = await createStudioApi(cast.jordan.client).listMyCalls(cast.jordan.id);
    expect(mine.map((m) => m.project.title)).toEqual(['My calls']);
  });
});
