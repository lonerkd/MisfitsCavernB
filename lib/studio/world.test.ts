import { describe, it, expect } from 'vitest';
import { checkWorld, intExtOf, placeSpelling, stretches, warningsForLocation, worldLocations, type WorldScene } from './world';
import type { LocationRecord } from './locations';

const scene = (n: number, heading: string, location: string, extra: Partial<WorldScene> = {}): WorldScene =>
  ({ id: `s${n}`, scene_number: n, ordinal: n - 1, location, heading, shoot_day: null, script_id: 'sc', ...extra });
const record = (name: string, patch: Partial<LocationRecord> = {}): LocationRecord =>
  ({ id: name, name, address: null, contact: null, status: 'confirmed', permit: 'not_needed', cost: 0, notes: null, ...patch });
const TODAY = '2026-11-22';

describe('where a location appears', () => {
  it('lists its scenes in script order with INT/EXT, time, story day, shoot day, date and pages', () => {
    const scenes = [
      scene(3, 'EXT. DOCK - NIGHT', 'DOCK', { time_of_day: 'NIGHT', story_day: 2, shoot_day: 2, est_duration: '3/8' }),
      scene(1, 'INT. DOCK - DAY', 'DOCK', { time_of_day: 'DAY', story_day: 1, shoot_day: 1, est_duration: '1 2/8' }),
      scene(2, 'INT. KITCHEN - DAY', 'KITCHEN', { time_of_day: 'UNKNOWN' }),
    ];
    const [dock, kitchen] = worldLocations(scenes, [record('DOCK'), record('OLD MILL')], [{ day_number: 1, shoot_date: '2026-11-25' }, { day_number: 2, shoot_date: null }]);
    expect(dock.appearances.map((a) => [a.number, a.intExt, a.time, a.storyDay, a.shootDay, a.shootDate, a.pages])).toEqual([
      [1, 'INT', 'day', 1, 1, '2026-11-25', '2/8'], [3, 'EXT', 'night', 2, 2, null, '3/8'],
    ]);
    expect(dock.days).toEqual([1, 2]);
    expect(kitchen.appearances[0].time).toBeNull();
    expect(kitchen.appearances[0].pages).toBeNull();
    const rows = worldLocations(scenes, [record('DOCK'), record('OLD MILL')], []);
    expect(rows.map((r) => [r.name, r.appearances.length])).toEqual([['DOCK', 2], ['KITCHEN', 1], ['OLD MILL', 0]]);
  });
  it('reads INT/EXT from the heading', () => {
    expect(['INT. A - DAY', 'EXT. A', '12 EXT A', 'INT./EXT. CAR - DAY', 'I/E CAR', 'EXT/INT CAR', 'THE END'].map(intExtOf)).toEqual(['INT', 'EXT', 'EXT', 'INT/EXT', 'INT/EXT', 'INT/EXT', null]);
  });
});

describe('a place spelled two ways', () => {
  const run = (names: string[]) =>
    checkWorld(worldLocations(names.map((n, i) => scene(i + 1, `INT. ${n} - DAY`, n)), names.map((n) => record(n)), []), TODAY).filter((w) => w.rule === 'spelling');

  it('flags an article, an apostrophe, St./Saint and & / and as the same place', () => {
    expect(run(['DOCK OFFICE', 'THE DOCK OFFICE'])).toHaveLength(1);
    expect(run(["JOHN'S HOUSE", 'JOHNS HOUSE'])).toHaveLength(1);
    expect(run(["ST. MARY'S CHURCH", "SAINT MARY'S CHURCH"])).toHaveLength(1);
    expect(run(['BAR & GRILL', 'BAR AND GRILL'])).toHaveLength(1);
  });
  it('flags a one-letter typo only when it is rare and long enough', () => {
    expect(run(['LIGHTHOUSE', 'LIGHTHOUSEE'])).toHaveLength(1);
    expect(run(['BARN', 'BARNS'])).toHaveLength(0);
  });
  it('does not flag different rooms, numbered places or sub-places', () => {
    expect(run(['APARTMENT 4A', 'APARTMENT 4B'])).toHaveLength(0);
    expect(run(['ROOM 101', 'ROOM 102'])).toHaveLength(0);
    expect(run(['SMITH HOUSE - KITCHEN', 'SMITH HOUSE - BEDROOM'])).toHaveLength(0);
    expect(run(['DOCK', 'DOCK OFFICE'])).toHaveLength(0);
  });
  it('never treats INT/EXT, the time of day or the era as a difference: those are not in the location', () => {
    const scenes = [
      scene(1, 'INT. LIGHTHOUSE - DAY', 'LIGHTHOUSE'), scene(2, 'EXT. LIGHTHOUSE - NIGHT', 'LIGHTHOUSE'),
      scene(3, 'INT. LIGHTHOUSE - NIGHT (1964)', 'LIGHTHOUSE'), scene(4, 'INT./EXT. LIGHTHOUSE - LATE 1962', 'LIGHTHOUSE'),
    ];
    expect(checkWorld(worldLocations(scenes, [record('LIGHTHOUSE')], []), TODAY).filter((w) => w.rule === 'spelling')).toEqual([]);
    // Even a legacy record that kept the time in its name collapses onto the place.
    expect(placeSpelling('LIGHTHOUSE - NIGHT')).toBe(placeSpelling('LIGHTHOUSE'));
    expect(placeSpelling('KITCHEN (1964)')).toBe('KITCHEN');
  });
  it('has a stable id, a sentence, a reason and a scene to jump to', () => {
    const scenes = [scene(1, 'INT. DOCK OFFICE - DAY', 'DOCK OFFICE'), scene(2, 'INT. DOCK OFFICE - NIGHT', 'DOCK OFFICE'), scene(3, 'EXT. THE DOCK OFFICE - DAY', 'THE DOCK OFFICE')];
    const [w] = checkWorld(worldLocations(scenes, [record('DOCK OFFICE'), record('THE DOCK OFFICE')], []), TODAY).filter((x) => x.rule === 'spelling');
    expect(w).toMatchObject({ id: 'spelling:DOCK OFFICE|DOCK OFFICE', rule: 'spelling', severity: 'warn', sceneNumber: 3, locations: ['DOCK OFFICE', 'THE DOCK OFFICE'] });
    expect(w.message).toBe('THE DOCK OFFICE and DOCK OFFICE look like one place spelled two ways.');
    expect(w.reason.length).toBeGreaterThan(20);
  });
});

describe('a shoot within two weeks at a place that is not locked down', () => {
  const at = (rec: LocationRecord | null, date: string | null, day = 1) =>
    checkWorld(worldLocations([scene(1, 'INT. MILL - DAY', 'MILL', { shoot_day: day })], rec ? [rec] : [], date ? [{ day_number: day, shoot_date: date }] : []), TODAY).filter((w) => w.rule === 'shoots-soon');

  it('flags a needed permit, an unconfirmed status and a place nobody scouted, and says which', () => {
    expect(at(record('MILL', { permit: 'needed' }), '2026-11-30')[0].message).toBe('MILL shoots in 8 days (day 1), and its permit is still needed.');
    expect(at(record('MILL', { status: 'scouting', permit: 'applied' }), '2026-12-06')[0].message).toContain('it is not confirmed and its permit is applied for, not granted');
    expect(at(null, '2026-11-22')[0].message).toBe('MILL shoots today (day 1), and it is not scouted.');
  });
  it('is quiet beyond 14 days, in the past, undated or ready', () => {
    expect(at(record('MILL', { permit: 'needed' }), '2026-12-07')).toEqual([]);
    expect(at(record('MILL', { permit: 'needed' }), '2026-12-06')).toHaveLength(1);
    expect(at(record('MILL', { permit: 'needed' }), '2026-11-21')).toEqual([]);
    expect(at(record('MILL', { permit: 'needed' }), null)).toEqual([]);
    expect(at(record('MILL', { permit: 'granted' }), '2026-11-25')).toEqual([]);
  });
  it('points at the first scene that shoots soon', () => {
    const w = at(record('MILL', { permit: 'needed' }), '2026-11-25')[0];
    expect(w).toMatchObject({ id: 'shoots-soon:MILL', severity: 'warn', sceneId: 's1', sceneNumber: 1 });
  });
});

describe('a place shot on many separate days', () => {
  const days = (ns: number[]) => checkWorld(worldLocations(ns.map((d, i) => scene(i + 1, 'EXT. PIER - DAY', 'PIER', { shoot_day: d })), [record('PIER')], []), TODAY).filter((w) => w.rule === 'many-days');
  it('counts stretches of adjacent days, not days', () => {
    expect(stretches([1, 2, 3, 7, 9, 10])).toEqual([[1, 2, 3], [7], [9, 10]]);
    expect(days([1, 4, 9])[0].message).toBe('PIER is shot on 3 days in 3 separate stretches (days 1, 4, 9).');
    expect(days([1, 2, 3, 4, 5])).toEqual([]);
    expect(days([1, 2, 6, 7])).toEqual([]);
  });
});

describe('a used place with no cost', () => {
  it('flags a blank cost, not zero, not a place with no record, not a record nobody uses', () => {
    const w = (rec: LocationRecord[]) => checkWorld(worldLocations([scene(1, 'INT. MILL - DAY', 'MILL')], rec, []), TODAY).filter((x) => x.rule === 'no-cost');
    expect(w([record('MILL', { cost: null })])).toHaveLength(1);
    expect(w([record('MILL', { cost: 0 })])).toEqual([]);
    expect(w([])).toEqual([]);
    expect(w([record('MILL'), record('ORPHAN', { cost: null })])).toEqual([]);
  });
  it('sorts warnings before notes and finds them by place', () => {
    const all = checkWorld(worldLocations([scene(1, 'INT. MILL - DAY', 'MILL', { shoot_day: 1 })], [record('MILL', { cost: null, permit: 'needed' })], [{ day_number: 1, shoot_date: '2026-11-23' }]), TODAY);
    expect(all.map((x) => x.rule)).toEqual(['shoots-soon', 'no-cost']);
    expect(warningsForLocation(all, 'MILL')).toHaveLength(2);
    expect(warningsForLocation(all, 'OTHER')).toHaveLength(0);
  });
});
