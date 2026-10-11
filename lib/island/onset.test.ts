import { describe, it, expect } from 'vitest';
import { shootDayToday, localDate } from './onset';

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
