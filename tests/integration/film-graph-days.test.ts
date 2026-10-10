import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { anonClient, createCast, destroyCast, type Cast } from './support/personas';
import { createCrewedProject } from './support/project';
import { createStudioApi } from '@/lib/studio/api';

// The film graph, step 1: a scene's place and day are real linked rows, kept
// in step with the heading's text and the day number that older code still
// reads and writes. As personas: Sam owns, Jordan is crew, Riley is outside.
let cast: Cast;
let projectId: string;
let otherProjectId: string;

beforeAll(async () => {
  cast = await createCast();
  ({ projectId } = await createCrewedProject(cast, 'Film graph days'));
  ({ projectId: otherProjectId } = await createCrewedProject(cast, 'Another film'));
});
afterAll(async () => { await destroyCast(cast); });

let n = 0;
async function addScene(fields: { location?: string | null; shoot_day?: number | null }, project = projectId) {
  n += 1;
  const { data, error } = await cast.sam.client.from('scenes')
    .insert({ project_id: project, scene_number: n, title: `Scene ${n}`, ...fields })
    .select('id, location, location_id, shoot_day, shoot_day_id').single();
  if (error) throw error;
  return data;
}
const scene = async (id: string) =>
  (await cast.sam.client.from('scenes').select('id, location, location_id, shoot_day, shoot_day_id').eq('id', id).single()).data!;
const dayRow = async (dayNumber: number, project = projectId) =>
  (await cast.sam.client.from('shoot_days').select('*').eq('project_id', project).eq('day_number', dayNumber).maybeSingle()).data;

describe('a scene’s place', () => {
  it('becomes a record, found by name whatever the case', async () => {
    const a = await addScene({ location: ' Harbor ' });
    const b = await addScene({ location: 'HARBOR' });
    const c = await addScene({ location: null });
    expect(a.location_id).not.toBeNull();
    expect(b.location_id).toBe(a.location_id);
    expect(c.location_id).toBeNull();
    const records = (await cast.sam.client.from('project_locations').select('id, name, status').eq('project_id', projectId).eq('name', 'HARBOR')).data;
    expect(records).toEqual([{ id: a.location_id, name: 'HARBOR', status: 'scouting' }]);
  });

  it('uses the record the production already made, without changing it', async () => {
    const made = (await cast.jordan.client.from('project_locations')
      .insert({ project_id: projectId, name: 'CAVE', status: 'confirmed', address: '1 Cave Rd' }).select('id').single()).data!;
    const s = await addScene({ location: 'cave' });
    expect(s.location_id).toBe(made.id);
    expect((await cast.sam.client.from('project_locations').select('status, address').eq('id', made.id).single()).data)
      .toEqual({ status: 'confirmed', address: '1 Cave Rd' });
  });

  it('follows a rewrite, and survives the record being removed', async () => {
    const s = await addScene({ location: 'HARBOR' });
    await cast.sam.client.from('scenes').update({ location: 'Lighthouse' }).eq('id', s.id);
    const moved = await scene(s.id);
    const lighthouse = (await cast.sam.client.from('project_locations').select('id').eq('project_id', projectId).eq('name', 'LIGHTHOUSE').single()).data!;
    expect(moved.location_id).toBe(lighthouse.id);

    await cast.sam.client.from('project_locations').delete().eq('id', lighthouse.id);
    expect(await scene(s.id)).toMatchObject({ location: 'Lighthouse', location_id: null });

    await cast.sam.client.from('scenes').update({ location: '' }).eq('id', s.id);
    expect((await scene(s.id)).location_id).toBeNull();
  });

  it('can’t point at another project’s location', async () => {
    const theirs = (await cast.sam.client.from('project_locations').insert({ project_id: otherProjectId, name: 'ELSEWHERE' }).select('id').single()).data!;
    const s = await addScene({ location: null });
    const res = await cast.sam.client.from('scenes').update({ location_id: theirs.id }).eq('id', s.id);
    expect(res.error).not.toBeNull();
  });
});

describe('a scene’s day', () => {
  it('is one row per project and number', async () => {
    const a = await addScene({ shoot_day: 2 });
    const b = await addScene({ shoot_day: 2 });
    expect(a.shoot_day_id).not.toBeNull();
    expect(b.shoot_day_id).toBe(a.shoot_day_id);
    const rows = (await cast.sam.client.from('shoot_days').select('id').eq('project_id', projectId).eq('day_number', 2)).data;
    expect(rows).toEqual([{ id: a.shoot_day_id }]);
  });

  it('moves with the day number, and is nothing when the scene is unscheduled', async () => {
    const s = await addScene({ shoot_day: 2 });
    await cast.jordan.client.from('scenes').update({ shoot_day: 5 }).eq('id', s.id);
    expect((await scene(s.id)).shoot_day_id).toBe((await dayRow(5))!.id);
    await cast.sam.client.from('scenes').update({ shoot_day: null }).eq('id', s.id);
    expect((await scene(s.id)).shoot_day_id).toBeNull();
  });

  it('is separate in each project', async () => {
    const mine = await addScene({ shoot_day: 2 });
    const theirs = await addScene({ shoot_day: 2 }, otherProjectId);
    expect(theirs.shoot_day_id).not.toBe(mine.shoot_day_id);
  });
});

describe('a day’s date', () => {
  it('is shared by the call sheet and the day, set from either side', async () => {
    const sheet = (await cast.sam.client.from('call_sheets')
      .insert({ project_id: projectId, shoot_day: 7, shoot_date: '2026-11-03' }).select('id, shoot_day_id').single()).data!;
    const day = (await dayRow(7))!;
    expect(sheet.shoot_day_id).toBe(day.id);
    expect(day.shoot_date).toBe('2026-11-03');

    await cast.jordan.client.from('shoot_days').update({ shoot_date: '2026-11-05' }).eq('id', day.id);
    expect((await cast.sam.client.from('call_sheets').select('shoot_date').eq('id', sheet.id).single()).data!.shoot_date).toBe('2026-11-05');

    await cast.sam.client.from('call_sheets').update({ shoot_date: '2026-11-06' }).eq('id', sheet.id);
    expect((await dayRow(7))!.shoot_date).toBe('2026-11-06');
  });

  it('can be set on a day that has no call sheet yet; a later call sheet takes it', async () => {
    const created = await cast.sam.client.from('shoot_days').insert({ project_id: projectId, day_number: 8, shoot_date: '2026-11-10' }).select('id').single();
    expect(created.error).toBeNull();
    const sheet = (await cast.sam.client.from('call_sheets').insert({ project_id: projectId, shoot_day: 8 }).select('shoot_date, shoot_day_id').single()).data!;
    expect(sheet).toEqual({ shoot_date: '2026-11-10', shoot_day_id: created.data!.id });
  });

  it('a call sheet with no date doesn’t wipe the day’s', async () => {
    await cast.sam.client.from('shoot_days').insert({ project_id: projectId, day_number: 9, shoot_date: '2026-11-12' });
    const sheet = (await cast.sam.client.from('call_sheets').insert({ project_id: projectId, shoot_day: 9 }).select('id').single()).data!;
    await cast.sam.client.from('call_sheets').update({ notes: 'Bring boots' }).eq('id', sheet.id);
    expect((await dayRow(9))!.shoot_date).toBe('2026-11-12');
  });
});

describe('where a location is', () => {
  it('takes coordinates in pairs and in range', async () => {
    const loc = (await cast.sam.client.from('project_locations').insert({ project_id: projectId, name: 'RIDGE' }).select('id').single()).data!;
    const set = (patch: { latitude?: number | null; longitude?: number | null; timezone?: string | null }) => cast.sam.client.from('project_locations').update(patch).eq('id', loc.id).select('latitude, longitude, timezone').single();
    expect((await set({ latitude: 51.0447 })).error).not.toBeNull();
    expect((await set({ latitude: 95, longitude: 10 })).error).not.toBeNull();
    expect((await set({ latitude: 10, longitude: 181 })).error).not.toBeNull();
    const ok = await set({ latitude: 51.0447, longitude: -114.0719, timezone: 'America/Edmonton' });
    expect(ok.data).toEqual({ latitude: 51.0447, longitude: -114.0719, timezone: 'America/Edmonton' });
    expect((await set({ latitude: null, longitude: null, timezone: null })).error).toBeNull();
  });
});

describe('who can touch days', () => {
  it('crew can; an outsider and a signed-out visitor see and change nothing', async () => {
    const day = (await dayRow(2))!;
    expect((await cast.riley.client.from('shoot_days').select('id').eq('project_id', projectId)).data).toEqual([]);
    expect((await anonClient().from('shoot_days').select('id').eq('project_id', projectId)).data ?? []).toEqual([]);
    const tried = await cast.riley.client.from('shoot_days').update({ shoot_date: '2030-01-01' }).eq('id', day.id).select('id');
    expect(tried.data ?? []).toEqual([]);
    expect((await cast.riley.client.from('shoot_days').insert({ project_id: projectId, day_number: 40 })).error).not.toBeNull();
    expect((await dayRow(2))!.shoot_date).toBeNull();
  });

  it('refuses a day numbered below one', async () => {
    expect((await cast.sam.client.from('shoot_days').insert({ project_id: projectId, day_number: 0 })).error).not.toBeNull();
  });
});

describe('through the Studio data layer', () => {
  it('sets, changes and clears a day’s date, making the day if it wasn’t there', async () => {
    const sam = createStudioApi(cast.sam.client);
    const made = await sam.setShootDayDate(projectId, 14, '2026-12-01');
    expect(made).toMatchObject({ day_number: 14, shoot_date: '2026-12-01' });
    const jordan = createStudioApi(cast.jordan.client);
    expect(await jordan.setShootDayDate(projectId, 14, '2026-12-02')).toMatchObject({ id: made.id, shoot_date: '2026-12-02' });
    expect((await sam.setShootDayDate(projectId, 14, null)).shoot_date).toBeNull();
    const listed = await sam.listShootDays(projectId);
    expect(listed.map((d) => d.day_number)).toEqual([...listed.map((d) => d.day_number)].sort((a, b) => a - b));
    expect(listed.some((d) => d.id === made.id)).toBe(true);
  });

  it('an outsider can’t set a date or list the days', async () => {
    const riley = createStudioApi(cast.riley.client);
    await expect(riley.setShootDayDate(projectId, 15, '2026-12-01')).rejects.toThrow();
    expect(await riley.listShootDays(projectId)).toEqual([]);
  });

  it('a location keeps its coordinates when something else about it changes', async () => {
    const sam = createStudioApi(cast.sam.client);
    const placed = await sam.saveLocation(projectId, 'Quarry', { latitude: 51.0447, longitude: -114.0719, timezone: 'America/Edmonton' });
    expect(placed).toMatchObject({ name: 'QUARRY', latitude: 51.0447, longitude: -114.0719, timezone: 'America/Edmonton' });
    const later = await sam.saveLocation(projectId, 'QUARRY', { status: 'confirmed' });
    expect(later).toMatchObject({ id: placed.id, status: 'confirmed', latitude: 51.0447, longitude: -114.0719 });
    const cleared = await sam.saveLocation(projectId, 'QUARRY', { latitude: null, longitude: null, timezone: null });
    expect(cleared).toMatchObject({ latitude: null, longitude: null, timezone: null, status: 'confirmed' });
  });
});
