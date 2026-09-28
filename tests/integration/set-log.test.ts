import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject, createScript } from './support/project';
import { createStudioApi } from '@/lib/studio/api';
import { parseScript } from '@/lib/scriptos/parser';

// On set as personas: the crew stamp the day's clock and log continuity; the
// shape of an entry is enforced; only the time and words can be corrected, by
// their author or the owner; a deleted day takes its clock with it but not the
// scene's continuity; outsiders see and write nothing.
let cast: Cast;
let projectId: string;
let sheetId: string;
let sceneId: string;
let shotId: string;
let callId: string;
let contId: string;

const TEXT = 'INT. CAVE - NIGHT\n\nSam lights a match.\n';

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'On set'));
  const scriptId = await createScript(cast, projectId, TEXT);
  const sam = createStudioApi(cast.sam.client);
  sceneId = (await sam.syncScriptScenes(scriptId, parseScript(TEXT).scenes))[0].id;
  sheetId = (await sam.saveCallSheet(projectId, 1, { shoot_date: '2026-10-03', estimated_wrap: '19:00' })).id;
  shotId = (await sam.addShot(projectId, sceneId, [])).id;
});

afterAll(async () => {
  await destroyCast(cast);
});

describe('set log', () => {
  it('crew stamp the clock and log continuity (a shot, a take, words)', async () => {
    const jordan = createStudioApi(cast.jordan.client);
    const call = await jordan.addSetLog({ project_id: projectId, kind: 'call', call_sheet_id: sheetId });
    expect(call).toMatchObject({ kind: 'call', call_sheet_id: sheetId, created_by: cast.jordan.id });
    callId = call.id;
    const cont = await jordan.addSetLog({ project_id: projectId, kind: 'continuity', scene_id: sceneId, shot_id: shotId, take: 3, body: 'Match in left hand' });
    expect(cont).toMatchObject({ take: 3, shot_id: shotId });
    contId = cont.id;
    expect((await createStudioApi(cast.sam.client).listSetLog(projectId)).map((r) => r.id)).toEqual(expect.arrayContaining([callId, contId]));
  });

  it('an entry has the right shape', async () => {
    const c = cast.jordan.client;
    const base = { project_id: projectId, created_by: cast.jordan.id };
    expect((await c.from('set_log').insert({ ...base, kind: 'wrap' })).error).not.toBeNull(); // clock needs a day
    expect((await c.from('set_log').insert({ ...base, kind: 'note', call_sheet_id: sheetId })).error).not.toBeNull(); // note needs words
    expect((await c.from('set_log').insert({ ...base, kind: 'continuity', call_sheet_id: sheetId, body: 'x' })).error).not.toBeNull(); // continuity is the scene's
    expect((await c.from('set_log').insert({ ...base, kind: 'rolling', call_sheet_id: sheetId, take: 2 })).error).not.toBeNull();
    expect((await c.from('set_log').insert({ ...base, kind: 'continuity', scene_id: sceneId, take: 1000, body: 'x' })).error).not.toBeNull();
    expect((await c.from('set_log').insert({ ...base, kind: 'lunch', call_sheet_id: sheetId, created_by: cast.sam.id })).error).not.toBeNull(); // as someone else
  });

  it('only the time and words change, by the author or the owner', async () => {
    const at = '2026-10-03T06:45:00.000Z';
    expect((await createStudioApi(cast.sam.client).updateSetLog(callId, { at })).at).toBe('2026-10-03T06:45:00+00:00');
    const { error } = await cast.jordan.client.from('set_log').update({ kind: 'wrap' }).eq('id', callId);
    expect(error).not.toBeNull();
    const moved = await cast.jordan.client.from('set_log').update({ call_sheet_id: null }).eq('id', callId);
    expect(moved.error).not.toBeNull();
  });

  it('outsiders see and write nothing', async () => {
    const riley = cast.riley.client;
    expect((await riley.from('set_log').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await riley.from('set_log').insert({ project_id: projectId, kind: 'note', call_sheet_id: sheetId, body: 'hi', created_by: cast.riley.id })).error).not.toBeNull();
    const { data } = await riley.from('set_log').update({ body: 'x' }).eq('id', contId).select('id');
    expect(data ?? []).toEqual([]);
  });

  it('deleting the day removes its clock; continuity stays with the scene', async () => {
    const { error } = await cast.sam.client.from('call_sheets').delete().eq('id', sheetId);
    expect(error).toBeNull();
    const rows = await createStudioApi(cast.sam.client).listSetLog(projectId);
    expect(rows.map((r) => r.id)).toEqual([contId]);
  });
});
