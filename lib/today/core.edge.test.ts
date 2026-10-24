import { describe, it, expect } from 'vitest';
import { dayLabel, daysUntil, dueLabel, localDay, nextShootDays, openTasks, urgency } from './core';

const task = (id: string, due: string | null, completed: boolean | null = false) => ({ id, title: id, due_date: due, completed });

describe('daysUntil — DST', () => {
  // Calendar days are counted on UTC day numbers, so a 23- or 25-hour local day is still one day.
  it.each([
    ['US spring forward', '2026-03-07', '2026-03-09', 2],
    ['US fall back', '2026-10-31', '2026-11-02', 2],
    ['EU spring forward', '2026-03-28', '2026-03-30', 2],
    ['EU fall back', '2026-10-24', '2026-10-26', 2],
    ['the day of the change itself', '2026-03-08', '2026-03-09', 1],
  ])('%s', (_n, from, to, days) => {
    expect(daysUntil(to, from)).toBe(days);
    expect(daysUntil(from, to)).toBe(-days);
  });

  it('localDay stays on the calendar day around the transition hours', () => {
    expect(localDay(new Date(2026, 2, 8, 0, 30))).toBe('2026-03-08');
    expect(localDay(new Date(2026, 2, 8, 12, 0))).toBe('2026-03-08');
    expect(localDay(new Date(2026, 10, 1, 1, 30))).toBe('2026-11-01');
    expect(localDay(new Date(2026, 10, 1, 23, 59))).toBe('2026-11-01');
  });

  it('labels the days either side of a change', () => {
    expect(dayLabel('2026-03-09', '2026-03-08')).toBe('Tomorrow');
    expect(dayLabel('2026-11-01', '2026-11-02')).toBe('Yesterday');
  });
});

describe('daysUntil — leap years', () => {
  it('has a 29 February in 2028 and 2000, not in 2026 or 1900/2100', () => {
    expect(daysUntil('2028-03-01', '2028-02-28')).toBe(2);
    expect(daysUntil('2000-03-01', '2000-02-28')).toBe(2);
    expect(daysUntil('2027-03-01', '2027-02-28')).toBe(1);
    expect(daysUntil('2100-03-01', '2100-02-28')).toBe(1);
    expect(daysUntil('1900-03-01', '1900-02-28')).toBe(1);
  });

  it('counts a whole leap year as 366 days and a common year as 365', () => {
    expect(daysUntil('2029-01-01', '2028-01-01')).toBe(366);
    expect(daysUntil('2027-01-01', '2026-01-01')).toBe(365);
  });

  it('labels 29 February', () => {
    expect(dayLabel('2028-02-29', '2028-02-28')).toBe('Tomorrow');
    expect(dayLabel('2028-02-29', '2028-02-01')).toBe('Tue 29 Feb');
    expect(dayLabel('2028-03-01', '2028-02-29')).toBe('Tomorrow');
  });

  it('refuses 29 February in a common year', () => {
    expect(daysUntil('2027-02-29', '2027-02-28')).toBeNaN();
    expect(daysUntil('2100-02-29', '2100-02-28')).toBeNaN();
  });
});

describe('malformed input', () => {
  const bad = ['', 'soon', '2026-02-30', '2026-13-01', '2026-00-10', '2026-04-31', '2026-1-5', '26-01-01', '2026/01/01', '2026-01-01T10:00:00Z', ' 2026-01-01', '2026-01-01 '];

  it.each(bad)('daysUntil(%j) is NaN, in either position', (s) => {
    expect(daysUntil(s, '2026-09-29')).toBeNaN();
    expect(daysUntil('2026-09-29', s)).toBeNaN();
  });

  it.each(bad)('dayLabel(%j) gives back the text, never "undefined NaN"', (s) => {
    expect(dayLabel(s, '2026-09-29')).toBe(s);
    expect(dayLabel('2026-09-29', s)).toBe('2026-09-29');
  });

  it.each(bad)('a task due %j is undated, with no label', (s) => {
    expect(urgency(s, '2026-09-29')).toBe('undated');
    expect(dueLabel(s, '2026-09-29')).toBeNull();
  });

  it('does not throw on null or undefined arriving from the database', () => {
    expect(() => daysUntil(null as unknown as string, '2026-09-29')).not.toThrow();
    expect(daysUntil(undefined as unknown as string, '2026-09-29')).toBeNaN();
  });

  it('never ranks an unreadable date as overdue', () => {
    expect(urgency('2026-02-30', '2026-09-29')).not.toBe('overdue');
  });

  it('drops shoot days with an unreadable date', () => {
    const s = (id: string, d: string | null) => ({ id, project_id: 'p', shoot_date: d, shoot_day: 1 });
    expect(nextShootDays([s('a', '2026-02-30'), s('b', 'tbc'), s('c', '2026-10-01')], '2026-09-29').map((x) => x.id)).toEqual(['c']);
  });
});

describe('openTasks — edges', () => {
  const TODAY = '2026-02-28';

  it('orders across a leap day and a DST change', () => {
    const list = [task('d', '2028-02-29'), task('a', '2026-03-08'), task('b', '2026-03-01'), task('c', '2026-02-27')];
    expect(openTasks(list, TODAY).map((t) => t.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('treats 7 days out as soon and 8 as later', () => {
    expect(urgency('2026-03-07', TODAY)).toBe('soon');
    expect(urgency('2026-03-08', TODAY)).toBe('later');
  });

  it('keeps unreadable dates with the undated, and tasks with completed null open', () => {
    const list = [task('bad', '2026-02-30'), task('late', '2026-02-01'), task('none', null), task('nul', '2026-03-01', null), task('done', '2026-02-01', true)];
    expect(openTasks(list, TODAY).map((t) => t.id)).toEqual(['late', 'nul', 'none', 'bad']);
  });

  it('handles an empty list', () => {
    expect(openTasks([], TODAY)).toEqual([]);
  });

  it('returns a new array and leaves the input order alone', () => {
    const list = [task('b', '2026-03-01'), task('a', '2026-02-27')];
    const out = openTasks(list, TODAY);
    expect(out).not.toBe(list);
    expect(list.map((t) => t.id)).toEqual(['b', 'a']);
  });
});
