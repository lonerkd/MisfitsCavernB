import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminClient, createCast, createPersona, destroyCast, type Cast, type Persona } from './support/personas';
import { createCrewedProject } from './support/project';

// Call sheets reach the crew, as personas: Sam (owner) issues; Jordan (crew,
// cast as MAYA) gets their own call and confirms; Casey (a viewer) is told
// but can't issue; Riley (outsider) is told nothing and can't confirm.
let cast: Cast;
let casey: Persona;
let projectId: string;
let sheetId: string;

const notes = async (who: Persona) =>
  (await who.client.from('notifications').select('title, body, link').eq('type', 'call_sheet').order('created_at')).data ?? [];

beforeAll(async () => {
  cast = await createCast();
  casey = await createPersona('casey');
  ({ projectId } = await createCrewedProject(cast, 'Night Shoot'));
  const admin = adminClient();
  await admin.from('project_crew').insert({ project_id: projectId, user_id: casey.id, role: 'viewer', status: 'confirmed' });
  await admin.from('character_castings').insert({ project_id: projectId, character_name: 'MAYA', crew_user_id: cast.jordan.id, created_by: cast.sam.id });
  sheetId = (await cast.sam.client.from('call_sheets')
    .insert({ project_id: projectId, shoot_day: 1, general_call: '06:00', location_address: '12 Harbor Rd' })
    .select('id').single()).data!.id;
  await cast.sam.client.from('call_sheet_calls').insert([
    { call_sheet_id: sheetId, project_id: projectId, character_name: 'MAYA', call_time: '06:30' },
    { call_sheet_id: sheetId, project_id: projectId, crew_user_id: casey.id, call_time: '05:45', remarks: 'Bring the slate' },
  ]);
});
afterAll(async () => { await destroyCast({ ...cast, casey }); });

describe('issuing a call sheet', () => {
  it('needs a date, and only the owner and leads can', async () => {
    expect((await cast.sam.client.rpc('issue_call_sheet', { p_sheet: sheetId })).error?.message).toMatch(/Date the shoot day/);
    await cast.sam.client.from('call_sheets').update({ shoot_date: '2026-11-03' }).eq('id', sheetId);
    expect((await casey.client.rpc('issue_call_sheet', { p_sheet: sheetId })).error?.message).toMatch(/owner and leads/);
    expect((await cast.riley.client.rpc('issue_call_sheet', { p_sheet: sheetId })).error?.message).toMatch(/not found/);
  });

  it('the issue columns can’t be written directly', async () => {
    const { error } = await cast.sam.client.from('call_sheets').update({ version: 5 }).eq('id', sheetId);
    expect(error?.message).toMatch(/issue_call_sheet/);
    const ins = await cast.sam.client.from('call_sheets').insert({ project_id: projectId, shoot_day: 9, issued_at: new Date().toISOString() });
    expect(ins.error?.message).toMatch(/issue_call_sheet/);
  });

  it('tells everyone their own call, and not the issuer or outsiders', async () => {
    const { data, error } = await cast.sam.client.rpc('issue_call_sheet', { p_sheet: sheetId });
    expect(error).toBeNull();
    expect(data).toMatchObject({ version: 1 });

    const [jordan] = await notes(cast.jordan);
    expect(jordan.title).toBe('Night Shoot — call sheet · Day 1 · Tue 3 Nov');
    expect(jordan.body).toBe('Your call 06:30 as MAYA. At 12 Harbor Rd.');
    expect(jordan.link).toBe(`/call/${sheetId}`);
    const [c] = await notes(casey);
    expect(c.body).toBe('Your call 05:45. Bring the slate. At 12 Harbor Rd.');
    expect(await notes(cast.sam)).toEqual([]);
    expect(await notes(cast.riley)).toEqual([]);
  });

  it('a revision says what changed for each person', async () => {
    expect((await cast.sam.client.rpc('issue_call_sheet', { p_sheet: sheetId })).error?.message).toMatch(/Nothing has changed since v1/);
    await cast.sam.client.from('call_sheet_calls').update({ call_time: '07:00' }).eq('call_sheet_id', sheetId).eq('character_name', 'MAYA');
    await cast.sam.client.from('call_sheets').update({ location_address: '40 Pier St' }).eq('id', sheetId);
    const { data } = await cast.sam.client.rpc('issue_call_sheet', { p_sheet: sheetId, p_note: 'Parking on the pier.' });
    expect(data).toMatchObject({ version: 2 });

    const jordan = (await notes(cast.jordan)).at(-1)!;
    expect(jordan.title).toBe('Night Shoot — revised call sheet (v2) · Day 1 · Tue 3 Nov');
    expect(jordan.body).toBe('Changed: location, your call 06:30 → 07:00. Your call 07:00 as MAYA. At 40 Pier St. Parking on the pier.');
    expect((await notes(casey)).at(-1)!.body).toBe('Changed: location. Your call 05:45. Bring the slate. At 40 Pier St. Parking on the pier.');
  });
});

describe('confirming', () => {
  it('the crew confirm the version they saw; outsiders can’t', async () => {
    expect((await cast.jordan.client.rpc('ack_call_sheet', { p_sheet: sheetId })).data).toBe(2);
    expect((await cast.riley.client.rpc('ack_call_sheet', { p_sheet: sheetId })).error).not.toBeNull();
    // No direct writes.
    expect((await cast.jordan.client.from('call_sheet_acks').insert({ call_sheet_id: sheetId, project_id: projectId, user_id: cast.jordan.id, version: 9 })).error).not.toBeNull();

    const acks = (await cast.sam.client.from('call_sheet_acks').select('user_id, version').eq('call_sheet_id', sheetId)).data;
    expect(acks).toEqual([{ user_id: cast.jordan.id, version: 2 }]);
    expect((await cast.riley.client.from('call_sheet_acks').select('user_id').eq('call_sheet_id', sheetId)).data).toEqual([]);
  });

  it('an unissued sheet can’t be confirmed', async () => {
    const draft = (await cast.sam.client.from('call_sheets').insert({ project_id: projectId, shoot_day: 2 }).select('id').single()).data!;
    expect((await cast.jordan.client.rpc('ack_call_sheet', { p_sheet: draft.id })).error?.message).toMatch(/hasn't been issued/);
  });
});

describe('reminders', () => {
  it('once, from the day before, for issued sheets only — and not callable by users', async () => {
    const admin = adminClient();
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await cast.sam.client.from('call_sheets').update({ shoot_date: tomorrow }).eq('id', sheetId);
    // A moved date is a revision; reissue it so the new date goes out.
    await cast.sam.client.rpc('issue_call_sheet', { p_sheet: sheetId });

    expect((await cast.sam.client.rpc('send_call_sheet_reminders')).error).not.toBeNull();
    const { data: sent, error } = await admin.rpc('send_call_sheet_reminders');
    expect(error).toBeNull();
    expect(sent).toBeGreaterThanOrEqual(3);
    const jordan = (await notes(cast.jordan)).at(-1)!;
    expect(jordan.title).toBe('Tomorrow: Night Shoot, Day 1');
    expect(jordan.body).toBe('Your call 07:00 as MAYA. At 40 Pier St.');
    expect((await notes(cast.sam)).map((n) => n.title)).toEqual(['Tomorrow: Night Shoot, Day 1']);
    expect(await notes(cast.riley)).toEqual([]);

    // Already reminded: nothing more for this sheet.
    const before = (await notes(cast.jordan)).length;
    await admin.rpc('send_call_sheet_reminders');
    expect((await notes(cast.jordan)).length).toBe(before);
  });
});
