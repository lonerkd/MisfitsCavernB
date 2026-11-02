import { describe, expect, it } from 'vitest';
import { placeKeyOf, placeResolver } from './places';
import { buildBoard } from '../studio/stripboard';
import { locationRows } from '../studio/locations';
import { sceneReadiness, type ReadinessScene } from '../studio/readiness';

const places = [{ id: 'p1', name: 'DOCK OFFICE' }, { id: 'p2', name: 'Old Pier' }];

describe('a scene’s place through the graph', () => {
  it('uses the linked location’s current name over the heading text', () => {
    expect(placeKeyOf({ location: 'HARBOR', location_id: 'p1' }, places)).toBe('DOCK OFFICE');
    expect(placeResolver(places)({ location: 'HARBOR', location_id: 'p2' })).toBe('OLD PIER');
  });
  it('falls back to the heading when unlinked or the link is gone', () => {
    expect(placeKeyOf({ location: ' harbor ' }, places)).toBe('HARBOR');
    expect(placeResolver(places)({ location: 'Harbor', location_id: 'gone' })).toBe('HARBOR');
    expect(placeResolver(places)({ location: null })).toBe('');
  });
});

const sc = (id: string, n: number, location: string, location_id: string | null, day = 1) => ({
  id, scene_number: n, location, location_id, time_of_day: null, est_duration: null, cast_list: null, shoot_day: day,
});

describe('readers follow a rename', () => {
  const scenes = [sc('a', 1, 'HARBOR', 'p1'), sc('b', 2, 'THE DOCK', 'p1')]; // two headings, one place

  it('the board counts one place, not two, when headings differ but the link is shared', () => {
    expect(buildBoard(scenes, 8)[0].locations).toEqual(['HARBOR', 'THE DOCK']); // text only (default)
    const placeFor = placeResolver(places);
    expect(buildBoard(scenes, 8, undefined, placeFor)[0].locations).toEqual(['DOCK OFFICE']);
  });

  it('the Locations list groups scenes under the record, whatever their headings say', () => {
    const records = [{ id: 'p1', name: 'DOCK OFFICE', address: null, contact: null, status: 'confirmed', permit: 'granted', cost: null, notes: null }];
    const rows = locationRows(scenes.map((x) => ({ ...x, heading: null })), records);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('DOCK OFFICE');
    expect(rows[0].scenes).toHaveLength(2);
    expect(rows[0].record?.id).toBe('p1');
  });

  it('readiness reads the record through the link', () => {
    const input = {
      cast: new Set<string>(), elementsByScene: new Map(), shotsByScene: new Map(), refsByScene: new Map(), dateOfDay: new Map<number, string>(),
      locations: new Map([['DOCK OFFICE', { status: 'confirmed', permit: 'granted' }]]),
    };
    const scene: ReadinessScene = { id: 'a', status: null, cast_list: null, shoot_day: 1, location: 'HARBOR', location_id: 'p1' };
    const check = (placeOf?: (s: ReadinessScene) => string) =>
      sceneReadiness(scene, { ...input, placeOf }).checks.find((c) => c.id === 'location')!;
    expect(check().state).toBe('todo'); // by the heading's text the place was never scouted
    expect(check(placeResolver(places)).state).toBe('done');
  });
});

describe('the auto-scheduler groups by place', () => {
  it('keeps scenes at one linked place together even when their headings differ', async () => {
    const { packShootDays } = await import('../studio/shoot-days');
    const mk = (id: string, n: number, location: string, location_id: string | null) => ({ id, scene_number: n, location, location_id, time_of_day: 'DAY', est_duration: '8/8', shoot_day: null });
    const scenes = [mk('a', 1, 'HARBOR', 'p1'), mk('b', 2, 'GARAGE', null), mk('c', 3, 'THE DOCK', 'p1')];
    const byText = packShootDays(scenes, 16);
    const byPlace = packShootDays(scenes, 16, placeResolver(places));
    const dayOf = (plan: ReturnType<typeof packShootDays>, id: string) => plan.updates.find((u) => u.id === id)?.shoot_day;
    expect(dayOf(byPlace, 'a')).toBe(dayOf(byPlace, 'c')); // the dock and the harbor are one place
    expect(dayOf(byText, 'a')).not.toBe(dayOf(byText, 'c')); // by text they are two
  });
});
