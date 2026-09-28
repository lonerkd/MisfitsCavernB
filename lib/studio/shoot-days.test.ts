import { describe, it, expect } from 'vitest';
import { packShootDays, eighthsOf, type SchedulableScene } from './shoot-days';

const scene = (n: number, location: string | null, tod = 'DAY', eighths = 8, day = 1): SchedulableScene => ({
  id: `s${n}`, scene_number: n, location, time_of_day: tod, est_duration: `${eighths}/8 pg`, shoot_day: day,
});

function daysOf(scenes: SchedulableScene[]) {
  const plan = packShootDays(scenes);
  const byId = new Map(scenes.map((s) => [s.id, s.shoot_day ?? 1]));
  for (const u of plan.updates) byId.set(u.id, u.shoot_day);
  return { plan, day: (id: string) => byId.get(id) };
}

describe('packShootDays', () => {
  it('keeps each location on its own day(s)', () => {
    const { day } = daysOf([scene(1, 'CAVE'), scene(2, 'ROAD'), scene(3, 'CAVE')]);
    expect(day('s1')).toBe(day('s3'));
    expect(day('s2')).not.toBe(day('s1'));
  });

  it('shoots day scenes before night scenes at the same location', () => {
    const { day } = daysOf([scene(1, 'CAVE', 'NIGHT', 30), scene(2, 'CAVE', 'DAY', 30)]);
    expect(day('s2')).toBeLessThan(day('s1')!);
  });

  it('never exceeds the page capacity of a day', () => {
    const scenes = Array.from({ length: 9 }, (_, i) => scene(i + 1, 'HOUSE', 'DAY', 12));
    const { plan, day } = daysOf(scenes);
    const load = new Map<number, number>();
    for (const s of scenes) load.set(day(s.id)!, (load.get(day(s.id)!) ?? 0) + 12);
    expect(Math.max(...Array.from(load.values()))).toBeLessThanOrEqual(40);
    expect(plan.days).toBe(3);
  });

  it('reports only scenes whose day changes, so a second run is a no-op', () => {
    const scenes = [scene(1, 'A'), scene(2, 'B'), scene(3, 'A')];
    const first = packShootDays(scenes);
    const applied = scenes.map((s) => ({ ...s, shoot_day: first.updates.find((u) => u.id === s.id)?.shoot_day ?? s.shoot_day }));
    expect(packShootDays(applied).updates).toEqual([]);
  });

  it('puts scenes without a location last', () => {
    const { day } = daysOf([scene(1, null), scene(2, 'CAVE')]);
    expect(day('s1')).toBeGreaterThan(day('s2')!);
  });

  it('reads page lengths in eighths, defaulting to a page', () => {
    expect(eighthsOf('3/8 pg')).toBe(3);
    expect(eighthsOf(null)).toBe(8);
  });
});
