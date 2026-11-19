import { describe, expect, it } from 'vitest';
import { coverage, shootingMinutes } from './coverage';
import type { DayClock } from './onset';

const at = (hhmm: string) => `2026-12-01T${hhmm}:00.000Z`;
const clock = (over: Partial<DayClock> = {}): DayClock => ({ call: at('07:00'), rolling: at('08:00'), lunch: null, back: null, wrap: null, ...over });
const sc = (id: string, n: number, status: string | null = null) => ({ id, scene_number: n, status });
const shots = (spec: Array<[string, number, number, number]>) => spec.flatMap(([scene, got, dropped, planned]) => [
  ...Array.from({ length: got }, () => ({ scene_id: scene, status: 'shot' })),
  ...Array.from({ length: dropped }, () => ({ scene_id: scene, status: 'omitted' })),
  ...Array.from({ length: planned }, () => ({ scene_id: scene, status: 'planned' })),
]);

describe('shootingMinutes', () => {
  it('counts from rolling, lunch taken out, and nothing before rolling', () => {
    expect(shootingMinutes(clock({ rolling: null }), new Date(at('10:00')))).toBe(0);
    expect(shootingMinutes(clock(), new Date(at('10:00')))).toBe(120);
    expect(shootingMinutes(clock({ lunch: at('09:00'), back: at('09:30') }), new Date(at('10:00')))).toBe(90);
    expect(shootingMinutes(clock({ lunch: at('09:30') }), new Date(at('10:00')))).toBe(90);
  });
});

describe('coverage', () => {
  const scenes = [sc('a', 1), sc('b', 2), sc('c', 3)];
  it('waits until the day is rolling, and says it is done when every shot is got or dropped', () => {
    expect(coverage({ now: new Date(at('07:30')), clock: clock({ rolling: null }), toWrapMinutes: 600, scenes, shots: shots([['a', 0, 0, 4]]) }).state).toBe('waiting');
    expect(coverage({ now: new Date(at('15:00')), clock: clock(), toWrapMinutes: 120, scenes, shots: shots([['a', 3, 1, 0], ['b', 2, 0, 0]]) }).state).toBe('done');
  });
  it('does not forecast from a couple of shots or the first half hour', () => {
    expect(coverage({ now: new Date(at('08:20')), clock: clock(), toWrapMinutes: 500, scenes, shots: shots([['a', 3, 0, 5]]) }).state).toBe('forecasting-soon');
    expect(coverage({ now: new Date(at('10:00')), clock: clock(), toWrapMinutes: 500, scenes, shots: shots([['a', 1, 0, 5]]) }).state).toBe('forecasting-soon');
  });
  it('is on pace when the pace gets the rest of the shots in before wrap', () => {
    // 6 shots in 2 h = 3 an hour; 4 hours left = 12 more; 8 remain.
    const c = coverage({ now: new Date(at('10:00')), clock: clock(), toWrapMinutes: 240, scenes, shots: shots([['a', 6, 0, 3], ['b', 0, 0, 5]]) });
    expect(c).toMatchObject({ state: 'on-pace', perHour: 3, canGet: 12, short: 0, protect: [1, 2], atRisk: [] });
  });
  it('is behind when it will not, and names the scenes the running order will not reach', () => {
    // 4 shots in 2 h = 2 an hour; 2 hours left = 4 more; 3 + 4 + 5 = 12 remain: scene 1 fits (3), the rest are at risk.
    const c = coverage({ now: new Date(at('10:00')), clock: clock(), toWrapMinutes: 120, scenes, shots: shots([['a', 4, 0, 3], ['b', 0, 0, 4], ['c', 0, 0, 5]]) });
    expect(c).toMatchObject({ state: 'behind', perHour: 2, canGet: 4, short: 8, protect: [1], atRisk: [2, 3] });
  });
  it('leaves wrapped scenes out, and says past-wrap once the planned wrap has gone', () => {
    const c = coverage({ now: new Date(at('10:00')), clock: clock(), toWrapMinutes: 120, scenes: [sc('a', 1, 'wrapped'), sc('b', 2)], shots: shots([['a', 0, 0, 9], ['b', 4, 0, 1]]) });
    expect(c.remaining).toBe(1);
    expect(coverage({ now: new Date(at('19:00')), clock: clock(), toWrapMinutes: null, scenes, shots: shots([['a', 2, 0, 3]]) }).state).toBe('past-wrap');
  });
});
