import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';

// Emergency details on the call sheet: Sam (owner) writes them, Jordan (crew) reads them (and the issued snapshot
// carries them), Riley (outsider) sees nothing and cannot write. The access rules are the call sheet's own, unchanged.
let cast: Cast;
let projectId: string;
let sheetId: string;

const safety = { hospital_name: 'St Mary’s', hospital_address: '1 Hospital Way', hospital_phone: '555 0100', police_phone: '911', medic: 'Dana' };
const bodies = async () =>
  ((await cast.jordan.client.from('notifications').select('body').eq('type', 'call_sheet').order('created_at')).data ?? []).map((n) => n.body as string);

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Safety Shoot'));
  sheetId = (await cast.sam.client.from('call_sheets')
    .insert({ project_id: projectId, shoot_day: 1, shoot_date: '2026-11-03', general_call: '06:00', location_address: '12 Harbor Rd' })
    .select('id').single()).data!.id;
});
afterAll(async () => { await destroyCast(cast); });

describe('emergency details', () => {
  it('the owner writes them, the crew read them, an outsider can do neither', async () => {
    expect((await cast.sam.client.from('call_sheets').update(safety).eq('id', sheetId)).error).toBeNull();
    const crew = (await cast.jordan.client.from('call_sheets').select('hospital_name, hospital_address, hospital_phone, police_phone, medic').eq('id', sheetId).single()).data;
    expect(crew).toEqual(safety);
    expect((await cast.riley.client.from('call_sheets').select('hospital_name').eq('id', sheetId)).data).toEqual([]);
    await cast.riley.client.from('call_sheets').update({ hospital_name: 'Leak' }).eq('id', sheetId);
    expect((await cast.sam.client.from('call_sheets').select('hospital_name').eq('id', sheetId).single()).data?.hospital_name).toBe('St Mary’s');
  });

  it('a field has a length limit', async () => {
    expect((await cast.sam.client.from('call_sheets').update({ medic: 'x'.repeat(201) }).eq('id', sheetId)).error).not.toBeNull();
  });

  it('go out with the issued snapshot, and the issued version is what the crew read', async () => {
    expect((await cast.sam.client.rpc('issue_call_sheet', { p_sheet: sheetId })).error).toBeNull();
    const issued = (await cast.jordan.client.from('call_sheets').select('issued').eq('id', sheetId).single()).data!.issued as Record<string, unknown>;
    expect(issued).toMatchObject(safety);
    // Edited after issue: the snapshot keeps what went out.
    await cast.sam.client.from('call_sheets').update({ hospital_phone: '555 0199' }).eq('id', sheetId);
    const still = (await cast.jordan.client.from('call_sheets').select('issued, hospital_phone').eq('id', sheetId).single()).data!;
    expect((still.issued as Record<string, unknown>).hospital_phone).toBe('555 0100');
    expect(still.hospital_phone).toBe('555 0199');
  });

  it('a revision that changes only them says so', async () => {
    expect((await cast.sam.client.rpc('issue_call_sheet', { p_sheet: sheetId })).data).toMatchObject({ version: 2 });
    expect((await bodies()).at(-1)).toMatch(/^Changed: emergency details\./);
  });

  it('a sheet with none issues no emergency keys, so an old sheet re-issued says nothing has changed', async () => {
    const plain = (await cast.sam.client.from('call_sheets').insert({ project_id: projectId, shoot_day: 2, shoot_date: '2026-11-04' }).select('id').single()).data!.id;
    expect((await cast.sam.client.rpc('issue_call_sheet', { p_sheet: plain })).error).toBeNull();
    const issued = (await cast.sam.client.from('call_sheets').select('issued').eq('id', plain).single()).data!.issued as Record<string, unknown>;
    expect(Object.keys(issued)).not.toContain('hospital_name');
    expect((await cast.sam.client.rpc('issue_call_sheet', { p_sheet: plain })).error?.message).toMatch(/Nothing has changed since v1/);
  });
});
