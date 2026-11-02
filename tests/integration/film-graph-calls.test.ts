import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Film graph, step 2 finished: a call-sheet call for a character is linked to
// the character (call_sheet_calls.character_id), follows a rename, and is
// guarded by the same project policies as the sheet. Sam writes, Jordan
// co-edits, Riley sees nothing.
let cast: Cast;
let projectId: string;
let sheetId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Film graph calls'));
  sheetId = (await cast.sam.client.from('call_sheets').insert({ project_id: projectId, shoot_day: 1, general_call: '06:00' }).select('id').single()).data!.id;
});
afterAll(async () => { await destroyCast(cast); });

const characterId = async (name: string) =>
  (await cast.sam.client.from('characters').select('id').eq('project_id', projectId).eq('name', name)).data?.[0]?.id ?? null;

describe('call_sheet_calls.character_id', () => {
  it('a call for a name links to that character, made if new and shared with the scenes that name it', async () => {
    await cast.sam.client.from('scenes').insert({ project_id: projectId, scene_number: 1, title: 'Scene 1', cast_list: 'MAYA' });
    const maya = await characterId('MAYA');
    expect(maya).not.toBeNull();

    const made = await cast.sam.client.from('call_sheet_calls')
      .insert({ call_sheet_id: sheetId, project_id: projectId, character_name: ' maya ', call_time: '06:30' }).select('character_id, character_name').single();
    expect(made.error).toBeNull();
    expect(made.data!.character_id).toBe(maya);

    const fresh = await cast.jordan.client.from('call_sheet_calls')
      .insert({ call_sheet_id: sheetId, project_id: projectId, character_name: 'Dock Boy', call_time: '07:00' }).select('character_id').single();
    expect(fresh.error).toBeNull();
    expect(fresh.data!.character_id).toBe(await characterId('DOCK BOY'));
  });

  it('a call follows its character through a rename', async () => {
    const maya = (await characterId('MAYA'))!;
    expect((await cast.sam.client.from('characters').update({ name: 'MAYA ROSE' }).eq('id', maya)).error).toBeNull();
    const call = (await cast.sam.client.from('call_sheet_calls').select('character_id, character_name').eq('call_sheet_id', sheetId).eq('character_id', maya).single()).data!;
    expect(call).toEqual({ character_id: maya, character_name: 'MAYA ROSE' });
  });

  it('a person-call has no character, and an outsider can neither read nor change any of it', async () => {
    const crew = await cast.sam.client.from('call_sheet_calls')
      .insert({ call_sheet_id: sheetId, project_id: projectId, crew_user_id: cast.jordan.id, call_time: '05:45' }).select('character_id').single();
    expect(crew.data!.character_id).toBeNull();

    expect((await cast.riley.client.from('call_sheet_calls').select('id').eq('call_sheet_id', sheetId)).data).toEqual([]);
    await cast.riley.client.from('call_sheet_calls').update({ character_name: 'HIJACK' }).eq('call_sheet_id', sheetId);
    expect((await cast.sam.client.from('call_sheet_calls').select('id').eq('call_sheet_id', sheetId).eq('character_name', 'HIJACK')).data).toEqual([]);
  });

  it('removing a character unlinks its calls and keeps them', async () => {
    const dock = (await characterId('DOCK BOY'))!;
    expect((await cast.sam.client.from('characters').delete().eq('id', dock)).error).toBeNull();
    const got = await cast.sam.client.from('call_sheet_calls').select('character_id, character_name').eq('call_sheet_id', sheetId).eq('character_name', 'Dock Boy').single();
    expect(got.error).toBeNull();
    const call = got.data!;
    // The text stays exactly as it was typed; only the link goes.
    expect(call).toEqual({ character_id: null, character_name: 'Dock Boy' });
  });

  it('changing a call’s name relinks it, and a rename survives two case-variants of one name on a sheet', async () => {
    const sheet = (await cast.sam.client.from('call_sheets').insert({ project_id: projectId, shoot_day: 2 }).select('id').single()).data!.id;
    const ins = await cast.sam.client.from('call_sheet_calls').insert([
      { call_sheet_id: sheet, project_id: projectId, character_name: 'Ivy', call_time: '06:00' },
      { call_sheet_id: sheet, project_id: projectId, character_name: 'IVY', call_time: '06:10' },
    ]).select('id, character_id');
    expect(ins.error).toBeNull();
    const ivy = (await characterId('IVY'))!;
    expect(ins.data!.every((r) => r.character_id === ivy)).toBe(true);

    // Both link to IVY; renaming must not fail on the unique (sheet, name) index.
    expect((await cast.sam.client.from('characters').update({ name: 'IVY ROSE' }).eq('id', ivy)).error).toBeNull();
    const after = (await cast.sam.client.from('call_sheet_calls').select('character_id, character_name').eq('call_sheet_id', sheet)).data!;
    expect(after.every((r) => r.character_id === ivy)).toBe(true);
    expect(after.filter((r) => r.character_name === 'IVY ROSE')).toHaveLength(1);

    // Pointing a call at another name moves its link.
    const leo = await cast.sam.client.from('call_sheet_calls').update({ character_name: 'LEO' }).eq('id', ins.data![0].id).select('character_id').single();
    expect(leo.data!.character_id).toBe(await characterId('LEO'));
  });

  it('an outsider cannot make a call, and so cannot make a character', async () => {
    const before = (await cast.sam.client.from('characters').select('id').eq('project_id', projectId)).data!.length;
    const r = await cast.riley.client.from('call_sheet_calls').insert({ call_sheet_id: sheetId, project_id: projectId, character_name: 'GHOST', call_time: '01:00' });
    expect(r.error).not.toBeNull();
    expect((await cast.sam.client.from('characters').select('id').eq('project_id', projectId)).data!.length).toBe(before);
    expect(await characterId('GHOST')).toBeNull();
  });
});
