import { describe, it, expect } from 'vitest';
import { nextShootDay, readinessByDay, sceneReadiness, type ReadinessInput, type ReadinessScene } from './readiness';

const scene = (id: string, patch: Partial<ReadinessScene> = {}): ReadinessScene => ({ id, status: 'planned', cast_list: 'MAYA, DEV', shoot_day: 1, ...patch });

const input = (patch: Partial<ReadinessInput> = {}): ReadinessInput => ({
  cast: new Set(['MAYA', 'DEV']),
  elementsByScene: new Map([['a', [{ name: 'Lantern', status: 'ready' }]]]),
  shotsByScene: new Map([['a', 3]]),
  refsByScene: new Map([['a', 1]]),
  dateOfDay: new Map([[1, '2026-10-03']]),
  ...patch,
});

describe('sceneReadiness', () => {
  it('a scene with everything in place is ready', () => {
    const r = sceneReadiness(scene('a'), input());
    expect(r).toMatchObject({ state: 'ready', done: 4, total: 4, blocker: null });
  });

  it('names what blocks it, first thing first', () => {
    const r = sceneReadiness(scene('a'), input({
      cast: new Set(['MAYA']),
      elementsByScene: new Map([['a', [{ name: 'Lantern', status: 'sourcing' }, { name: 'Coat', status: 'ready' }]]]),
      dateOfDay: new Map(),
    }));
    expect(r.state).toBe('blocked');
    expect(r.blocker?.detail).toBe('Cast DEV');
    expect(r.checks.find((c) => c.id === 'elements')?.detail).toBe('1 of 2 not ready: Lantern');
    expect(r.checks.find((c) => c.id === 'date')?.detail).toBe('Day 1 has no date');
    expect(r.done).toBe(1);
  });

  it('a scene nobody speaks in has no casting to do; references never block', () => {
    const r = sceneReadiness(scene('a', { cast_list: null }), input({ refsByScene: new Map() }));
    expect(r.checks.find((c) => c.id === 'cast')?.state).toBe('none');
    expect(r.checks.find((c) => c.id === 'refs')?.state).toBe('todo');
    expect(r).toMatchObject({ state: 'ready', total: 3 });
  });

  it('an unbroken-down or unscheduled scene is not ready', () => {
    const r = sceneReadiness(scene('b', { shoot_day: null }), input());
    expect(r.checks.find((c) => c.id === 'elements')?.detail).toBe('Not broken down');
    expect(r.checks.find((c) => c.id === 'date')?.detail).toBe('Not scheduled');
    expect(r.state).toBe('blocked');
  });

  it('shot and wrapped scenes say so, whatever is missing', () => {
    expect(sceneReadiness(scene('b', { status: 'wrapped' }), input()).state).toBe('wrapped');
    expect(sceneReadiness(scene('b', { status: 'shot' }), input()).state).toBe('shot');
  });

  it('long lists are shortened', () => {
    const r = sceneReadiness(scene('a', { cast_list: 'A, B, C, D, E' }), input({ cast: new Set() }));
    expect(r.blocker?.detail).toBe('Cast A, B, C +2');
  });
});

describe('by day', () => {
  const scenes = [scene('a', { shoot_day: 2 }), scene('b', { shoot_day: 1 }), scene('c', { shoot_day: null }), scene('d', { shoot_day: 1, status: 'wrapped' })];
  const days = readinessByDay(scenes, input({ dateOfDay: new Map([[1, '2026-10-01'], [2, '2026-10-03']]) }));

  it('groups in day order, unscheduled last', () => {
    expect(days.map((d) => d.day)).toEqual([1, 2, 0]);
    expect(days[0]).toMatchObject({ date: '2026-10-01', blocked: 1, ready: 0 });
  });

  it('the next day to prepare is the first dated one from today with scenes left', () => {
    expect(nextShootDay(days, '2026-09-27')?.day).toBe(1);
    expect(nextShootDay(days, '2026-10-02')?.day).toBe(2);
    expect(nextShootDay(days, '2026-11-01')).toBeNull();
  });
});
