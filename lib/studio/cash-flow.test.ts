import { describe, expect, it } from 'vitest';
import { cashFlow } from './cash-flow';

const line = (amount: number) => ({ id: String(amount), category: 'X', amount });
const paid = (amount: number, d: string) => ({ amount, status: 'paid', spent_on: d, paid_at: `${d}T10:00:00Z` });
const po = (amount: number, d: string) => ({ amount, status: 'committed', spent_on: d, paid_at: null });

describe('cashFlow', () => {
  it('an empty project has no weeks and nothing over', () => {
    const c = cashFlow([], [], []);
    expect(c).toMatchObject({ weeks: [], planned: 0, spent: 0, remaining: 0, overBy: 0, crossingWeek: null, crossingUndated: false });
  });

  it('groups by Monday-to-Sunday week, paid on paid_at and committed on its date', () => {
    // 2026-11-16 is a Monday; 11-22 a Sunday; 11-23 the next Monday.
    const c = cashFlow([line(1000)], [paid(100, '2026-11-16'), paid(50, '2026-11-22'), po(200, '2026-11-23'), { amount: 30, status: 'paid', spent_on: '2026-11-01', paid_at: '2026-11-18T00:00:00Z' }], []);
    expect(c.weeks.map((w) => [w.start, w.end, w.paid, w.committed, w.total, w.running])).toEqual([
      ['2026-11-16', '2026-11-22', 180, 0, 180, 180],
      ['2026-11-23', '2026-11-29', 0, 200, 200, 380],
    ]);
    expect(c.spent).toBe(380);
    expect(c.remaining).toBe(620);
    expect(c.crossingWeek).toBeNull();
  });

  it('marks the week the running total first exceeds the plan, and every week after as over', () => {
    const c = cashFlow([line(500)], [po(300, '2026-11-02'), paid(150, '2026-11-09'), po(100, '2026-11-16'), po(10, '2026-11-23')], []);
    expect(c.weeks.map((w) => [w.running, w.over, w.crossing])).toEqual([[300, false, false], [450, false, false], [550, true, true], [560, true, false]]);
    expect(c.crossingWeek).toBe('2026-11-16');
    expect(c.overBy).toBe(60);
    expect(c.remaining).toBe(0);
  });

  it('exactly at the plan is not over', () => {
    const c = cashFlow([line(100)], [paid(100, '2026-11-16')], []);
    expect(c.weeks[0].over).toBe(false);
    expect(c.overBy).toBe(0);
  });

  it('no plan means nothing is ever over', () => {
    const c = cashFlow([], [paid(100, '2026-11-16')], []);
    expect(c.weeks[0]).toMatchObject({ over: false, crossing: false });
    expect(c.overBy).toBe(0);
  });

  it('counts approved labour at its rate on the day worked; pending and unrated hours are not money', () => {
    const c = cashFlow([line(1000)], [], [
      { hours: 8, rate: 25, status: 'approved', work_date: '2026-11-17' },
      { hours: 4, rate: null, status: 'approved', work_date: '2026-11-17' },
      { hours: 6, rate: null, status: 'submitted', work_date: '2026-11-18' },
      { hours: 2, rate: 30, status: 'submitted', work_date: '2026-11-18' },
      { hours: 9, rate: 99, status: 'rejected', work_date: '2026-11-18' },
    ]);
    expect(c.weeks).toHaveLength(1);
    expect(c.weeks[0]).toMatchObject({ labour: 260, total: 260 });
    expect(c.pendingHours).toBe(6);
    expect(c.unratedHours).toBe(4);
  });

  it('keeps undated or unreadable dates in the totals after the last week, and can cross there', () => {
    const c = cashFlow([line(100)], [paid(60, '2026-11-16'), po(50, 'garbage'), po(1, '2026-02-31')], []);
    expect(c.weeks).toHaveLength(1);
    expect(c.undated).toMatchObject({ committed: 51, total: 51 });
    expect(c.spent).toBe(111);
    expect(c.crossingWeek).toBeNull();
    expect(c.crossingUndated).toBe(true);
    expect(c.overBy).toBe(11);
  });

  it('sums planned from the lines, tolerating strings and nulls', () => {
    const c = cashFlow([{ id: 'a', category: 'A', amount: '250.50' }, { id: 'b', category: 'B', amount: null }], [{ amount: '10.25', status: 'paid', spent_on: '2026-11-16', paid_at: null }], []);
    expect(c.planned).toBe(250.5);
    expect(c.weeks[0].paid).toBe(10.25);
    expect(c.remaining).toBe(240.25);
  });
});
