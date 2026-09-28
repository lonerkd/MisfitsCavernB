import { describe, it, expect } from 'vitest';
import { locationReadiness, locationRows, type LocationRecord } from './locations';
import { sceneReadiness, type ReadinessInput } from './readiness';

const scene = (n: number, location: string | null, heading: string, day: number | null = null) =>
  ({ id: `s${n}`, scene_number: n, location, heading, shoot_day: day });
const record = (name: string, patch: Partial<LocationRecord> = {}): LocationRecord =>
  ({ id: name, name, address: null, contact: null, status: 'scouting', permit: 'unknown', cost: null, notes: null, ...patch });

describe('the script’s locations', () => {
  it('groups scenes by location, busiest first, then records the script doesn’t use', () => {
    const rows = locationRows(
      [scene(3, 'Harbor', 'EXT. HARBOR - NIGHT', 2), scene(1, 'HARBOR', 'INT. HARBOR - DAY', 1), scene(2, 'KITCHEN', 'INT. KITCHEN - DAY'), scene(4, null, 'BLACK.')],
      [record('HARBOR', { address: '12 Harbor Rd' }), record('WAREHOUSE')],
    );
    expect(rows.map((r) => [r.name, r.scenes.map((s) => s.scene_number), r.days, r.exterior, r.night, r.record?.address ?? null])).toEqual([
      ['HARBOR', [1, 3], [1, 2], true, true, '12 Harbor Rd'],
      ['KITCHEN', [2], [], false, false, null],
      ['WAREHOUSE', [], [], false, false, null],
    ]);
  });

  it('is ready when confirmed with any permit it needs granted', () => {
    expect(locationReadiness('HARBOR', null)).toEqual({ ready: false, detail: 'HARBOR not scouted' });
    expect(locationReadiness('HARBOR', { status: 'option', permit: 'unknown' }).detail).toBe('HARBOR on hold, not confirmed');
    expect(locationReadiness('HARBOR', { status: 'confirmed', permit: 'applied' }).detail).toBe('HARBOR permit pending');
    expect(locationReadiness('HARBOR', { status: 'confirmed', permit: 'needed' }).detail).toBe('HARBOR permit needed');
    expect(locationReadiness('HARBOR', { status: 'confirmed', permit: 'granted' }).ready).toBe(true);
    expect(locationReadiness('HARBOR', { status: 'confirmed', permit: 'unknown' }).ready).toBe(true);
  });
});

describe('location on the readiness board', () => {
  const base: ReadinessInput = {
    cast: new Set(), elementsByScene: new Map([['s1', [{ name: 'Lantern', status: 'ready' }]]]),
    shotsByScene: new Map([['s1', 1]]), refsByScene: new Map(), dateOfDay: new Map([[1, '2026-11-03']]),
  };
  const sc = { id: 's1', status: null, cast_list: null, shoot_day: 1, location: 'Harbor' };

  it('blocks a scene until its location is locked down', () => {
    const blocked = sceneReadiness(sc, { ...base, locations: new Map() });
    expect(blocked.state).toBe('blocked');
    expect(blocked.blocker).toMatchObject({ id: 'location', detail: 'HARBOR not scouted' });
    const ready = sceneReadiness(sc, { ...base, locations: new Map([['HARBOR', { status: 'confirmed', permit: 'granted' }]]) });
    expect(ready).toMatchObject({ state: 'ready', done: 4, total: 4 });
  });

  it('doesn’t apply without a location, or without location data', () => {
    expect(sceneReadiness({ ...sc, location: null }, { ...base, locations: new Map() }).checks.find((c) => c.id === 'location')?.state).toBe('none');
    expect(sceneReadiness(sc, base).state).toBe('ready');
  });
});
