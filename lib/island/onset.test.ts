import { describe, it, expect } from 'vitest';
import { duration, onSetLine, shootDayToday, localDate } from './onset';

const days = [
  { id: 'a', day_number: 1, shoot_date: '2026-10-10' },
  { id: 'b', day_number: 2, shoot_date: '2026-10-11' },
  { id: 'c', day_number: 3, shoot_date: null },
];

describe('shootDayToday', () => {
  it('finds the day dated today', () => {
    expect(shootDayToday(days, '2026-10-11')?.id).toBe('b');
  });
  it('is null on a day with no shoot, and ignores undated days', () => {
    expect(shootDayToday(days, '2026-10-12')).toBeNull();
    expect(shootDayToday([], '2026-10-11')).toBeNull();
  });
});

describe('localDate', () => {
  it('uses the local calendar day, not UTC', () => {
    expect(localDate(new Date(2026, 9, 11, 23, 30))).toBe('2026-10-11');
    expect(localDate(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });
});

describe('duration', () => {
  it('writes minutes the way a person says them', () => {
    expect(duration(0)).toBe('0m');
    expect(duration(45)).toBe('45m');
    expect(duration(75)).toBe('1h 15m');
    expect(duration(125)).toBe('2h 05m');
    expect(duration(120)).toBe('2h');
    expect(duration(-5)).toBe('0m');
  });
});

describe('onSetLine', () => {
  const status = (phase: 'before' | 'prep' | 'shooting' | 'lunch' | 'wrapped', onSetMinutes: number, overtimeMinutes = 0, toWrapMinutes: number | null = null) => ({ phase, onSetMinutes, overtimeMinutes, toWrapMinutes });

  it('says nothing before the crew call is stamped', () => {
    expect(onSetLine(status('before', 0))).toBeNull();
  });
  it('says where the day is and how long they have been on set; the island adds what is left to the planned wrap', () => {
    expect(onSetLine(status('shooting', 252, 0, 80))).toEqual({ short: 'Rolling · 4h 12m on set', full: 'Rolling · 4h 12m on set · 1h 20m to wrap' });
    expect(onSetLine(status('prep', 20))).toEqual({ short: 'Crew called · 20m on set', full: 'Crew called · 20m on set' });
    expect(onSetLine(status('lunch', 300, 0, 40))?.full).toBe('Lunch · 5h on set · 40m to wrap');
  });
  it('says how far over the planned wrap the day is, and after the wrap shows what the day came to', () => {
    expect(onSetLine(status('shooting', 700, 25))?.full).toBe('Rolling · 11h 40m on set · 25m over');
    expect(onSetLine(status('wrapped', 660, 0, null))?.full).toBe('Wrapped · 11h on set');
    expect(onSetLine(status('wrapped', 660, 30))?.full).toBe('Wrapped · 11h on set · 30m over');
  });
});
