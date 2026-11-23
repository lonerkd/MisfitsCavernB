import { describe, it, expect } from 'vitest';
import { takeSnapshot, parseSnapshot, diffSchedules, restorePlan, describeDiff } from './schedule-versions';

const scenes = (...rows: Array<[string, number, number | null]>) => rows.map(([id, scene_number, shoot_day]) => ({ id, scene_number, shoot_day }));
const days = (...rows: Array<[number, string | null]>) => rows.map(([day_number, shoot_date]) => ({ day_number, shoot_date }));

describe('takeSnapshot', () => {
  it('puts an unscheduled scene on day 1 and sorts by scene number and day', () => {
    const s = takeSnapshot(scenes(['b', 2, null], ['a', 1, 3]), days([2, '2026-12-02'], [1, null]));
    expect(s.scenes).toEqual([{ id: 'a', scene_number: 1, shoot_day: 3 }, { id: 'b', scene_number: 2, shoot_day: 1 }]);
    expect(s.days).toEqual([{ day: 1, date: null }, { day: 2, date: '2026-12-02' }]);
  });
});

describe('parseSnapshot', () => {
  it('accepts what takeSnapshot wrote and refuses anything else', () => {
    const s = takeSnapshot(scenes(['a', 1, 2]), days([1, '2026-12-01']));
    expect(parseSnapshot(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot({ scenes: 'x', days: [] })).toBeNull();
    expect(parseSnapshot({ scenes: [{ id: 'a' }], days: [] })).toBeNull();
    expect(parseSnapshot({ scenes: [], days: [{ day: 'one' }] })).toBeNull();
  });
});

describe('diffSchedules', () => {
  const v = takeSnapshot(scenes(['a', 1, 1], ['b', 2, 1], ['c', 3, 2]), days([1, '2026-12-01'], [2, '2026-12-02']));

  it('is the same for the same schedule', () => {
    const d = diffSchedules(v, v);
    expect(d.same).toBe(true);
    expect(describeDiff(d)).toBe('No difference');
  });

  it('lists moved scenes, added, removed and changed dates', () => {
    const live = takeSnapshot(scenes(['a', 1, 1], ['b', 2, 3], ['d', 4, 2]), days([1, '2026-12-01'], [2, '2026-12-09']));
    const d = diffSchedules(v, live);
    expect(d.moved).toEqual([{ id: 'b', scene_number: 2, from: 1, to: 3 }]);
    expect(d.added).toEqual([{ id: 'd', scene_number: 4, day: 2 }]);
    expect(d.removed).toEqual([{ id: 'c', scene_number: 3, day: 2 }]);
    expect(d.dates).toEqual([{ day: 2, from: '2026-12-02', to: '2026-12-09' }]);
    expect(d.same).toBe(false);
    expect(describeDiff(d)).toBe('1 scene moved, 1 scene added, 1 scene removed, 1 day date changed');
  });

  it('treats a day that has no row as undated', () => {
    const live = takeSnapshot(scenes(['a', 1, 1]), days([1, '2026-12-01']));
    expect(diffSchedules(v, live).dates).toEqual([{ day: 2, from: '2026-12-02', to: null }]);
  });
});

describe('restorePlan', () => {
  const v = takeSnapshot(scenes(['a', 1, 1], ['b', 2, 1], ['c', 3, 2]), days([1, '2026-12-01'], [2, '2026-12-02']));

  it('moves each scene back and re-dates the version days', () => {
    const live = takeSnapshot(scenes(['a', 1, 2], ['b', 2, 1], ['c', 3, 2], ['n', 4, 4]), days([1, '2026-12-01'], [2, '2026-12-20'], [4, '2026-12-24']));
    const p = restorePlan(v, live);
    expect(p.moves).toEqual([{ id: 'a', scene_number: 1, from: 2, to: 1 }]);
    // Day 4 exists only live: it keeps its date; day 2 goes back to the version's.
    expect(p.dates).toEqual([{ day: 2, from: '2026-12-20', to: '2026-12-02' }]);
    expect(p.gone).toBe(0);
  });

  it('counts a version scene that is gone and leaves a newer scene alone', () => {
    const live = takeSnapshot(scenes(['a', 1, 1], ['b', 2, 1], ['n', 4, 5]), days([1, '2026-12-01'], [2, '2026-12-02']));
    const p = restorePlan(v, live);
    expect(p.moves).toEqual([]);
    expect(p.gone).toBe(1);
  });
});
