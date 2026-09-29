import { describe, it, expect } from 'vitest';
import { awayOn, dayConflicts, describeRange, overlaps, rangeProblem, upcoming, type Away } from './core';

const away: Away[] = [
  { user_id: 'mara', starts_on: '2026-10-03', ends_on: '2026-10-05' },
  { user_id: 'theo', starts_on: '2026-10-05', ends_on: '2026-10-05' },
  { user_id: 'mara', starts_on: '2026-10-04', ends_on: '2026-10-10' },
  { user_id: 'june', starts_on: '2026-09-01', ends_on: '2026-09-20' },
];

describe('who is away', () => {
  it('covers both ends of a range', () => {
    expect(overlaps(away[0], '2026-10-05', '2026-10-05')).toBe(true);
    expect(overlaps(away[0], '2026-10-06', '2026-10-09')).toBe(false);
    expect(awayOn(away, '2026-10-05').map((a) => a.user_id)).toEqual(['mara', 'theo', 'mara']);
  });

  it('lists each shoot day’s conflicts once per person, and skips undated days', () => {
    const c = dayConflicts([
      { shoot_day: 1, shoot_date: '2026-10-02' },
      { shoot_day: 2, shoot_date: '2026-10-05' },
      { shoot_day: 3, shoot_date: null },
      { shoot_day: 4, shoot_date: '2026-10-08' },
    ], away);
    expect([...c.keys()]).toEqual([2, 4]);
    expect(c.get(2)!.map((a) => a.user_id)).toEqual(['mara', 'theo']);
    expect(c.get(4)!.map((a) => a.user_id)).toEqual(['mara']);
  });

  it('upcoming leaves out what has ended', () => {
    expect(upcoming(away, 'june', '2026-09-29')).toEqual([]);
    expect(upcoming(away, 'mara', '2026-09-29').map((a) => a.starts_on)).toEqual(['2026-10-03', '2026-10-04']);
  });
});

describe('saying a range', () => {
  it('is short in the current year', () => {
    expect(describeRange('2026-10-03', '2026-10-03', 2026)).toBe('Oct 3');
    expect(describeRange('2026-10-03', '2026-10-05', 2026)).toBe('Oct 3–5');
    expect(describeRange('2026-10-30', '2026-11-02', 2026)).toBe('Oct 30 – Nov 2');
  });

  it('adds the year when it isn’t this one', () => {
    expect(describeRange('2027-01-04', '2027-01-06', 2026)).toBe('Jan 4–6, 2027');
    expect(describeRange('2026-12-30', '2027-01-02', 2026)).toBe('Dec 30, 2026 – Jan 2, 2027');
  });
});

describe('checking a range', () => {
  it('needs two real days in order, a year at most', () => {
    expect(rangeProblem('2026-10-03', '2026-10-05')).toBeNull();
    expect(rangeProblem('', '2026-10-05')).toMatch(/first day/);
    expect(rangeProblem('2026-10-03', '')).toMatch(/last day/);
    expect(rangeProblem('2026-10-05', '2026-10-03')).toMatch(/before/);
    expect(rangeProblem('2026-01-01', '2027-06-01')).toMatch(/year/);
  });
});
