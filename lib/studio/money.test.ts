import { describe, it, expect } from 'vitest';
import { labourByDay, money, moneySummary } from './money';

describe('money, summed', () => {
  const lines = [
    { id: 'cam', category: 'Camera', description: 'Lenses', amount: '1000.00' },
    { id: 'loc', category: 'Locations', amount: 500 },
  ];

  it('plans against committed and paid, per line and in total', () => {
    const s = moneySummary(lines, [
      { id: '1', budget_item_id: 'cam', amount: '400', status: 'committed' },
      { id: '2', budget_item_id: 'cam', amount: 250.5, status: 'paid' },
      { id: '3', budget_item_id: 'loc', amount: 600, status: 'paid' },
      { id: '4', budget_item_id: null, amount: 40, status: 'paid' },
    ], []);
    expect(s.lines).toEqual([
      { id: 'cam', label: 'Camera — Lenses', base: 1000, fringe: 0, planned: 1000, committed: 400, paid: 250.5, left: 349.5 },
      { id: 'loc', label: 'Locations', base: 500, fringe: 0, planned: 500, committed: 0, paid: 600, left: -100 },
    ]);
    expect(s.unassigned).toEqual({ committed: 0, paid: 40 });
    expect(s.totals).toEqual({ planned: 1500, committed: 400, paid: 890.5, left: 209.5 });
  });

  it('counts approved labour at its rate; pending and unrated hours are shown, not spent', () => {
    const s = moneySummary(lines, [], [
      { user_id: 'a', hours: 10, rate: 30, status: 'approved' },
      { user_id: 'b', hours: '8', rate: null, status: 'approved' },
      { user_id: 'c', hours: 6, rate: 25, status: 'submitted' },
      { user_id: 'd', hours: 4, rate: 25, status: 'rejected' },
    ]);
    expect(s.labour).toEqual({ paid: 300, hours: 18, pendingHours: 6, unratedHours: 8 });
    expect(s.totals).toMatchObject({ paid: 300, left: 1200 });
  });

  it('formats dollars', () => {
    expect(money(1500)).toBe('$1,500');
    expect(money(250.5)).toBe('$250.50');
    expect(money(-100)).toBe('−$100');
  });
});

describe('labour by shoot day', () => {
  const days = new Map([[1, '2026-12-01'], [2, '2026-12-02']]);
  const h = (work_date: string, hours: number, rate: number | null, status: string) => ({ user_id: 'u', work_date, hours, rate, status });
  it('puts approved hours at their rate on the day they were worked, and keeps pending and unrated apart', () => {
    const out = labourByDay([h('2026-12-01', 10, 25, 'approved'), h('2026-12-01', 8, 30, 'approved'), h('2026-12-01', 4, 20, 'submitted'), h('2026-12-02', 6, null, 'approved'), h('2026-12-02', 3, 50, 'rejected')], days);
    expect(out.get(1)).toEqual({ paid: 490, hours: 18, pendingHours: 4, unratedHours: 0 });
    expect(out.get(2)).toEqual({ paid: 0, hours: 6, pendingHours: 0, unratedHours: 6 });
  });
  it('ignores hours on a date that is no shoot day', () => {
    expect(labourByDay([h('2026-12-09', 8, 25, 'approved')], days).size).toBe(0);
  });
});

describe('money with fringes', () => {
  it('plans a line at its base plus its fringe, so left and the totals follow; no fringe changes nothing', () => {
    const s = moneySummary([
      { id: 'a', category: 'Gaffer', amount: '1000.00', fringe_amount: '215.00' },
      { id: 'b', category: 'Grip', amount: 500 },
    ], [{ id: '1', budget_item_id: 'a', amount: 1200, status: 'paid' }], []);
    expect(s.lines[0]).toMatchObject({ base: 1000, fringe: 215, planned: 1215, paid: 1200, left: 15 });
    expect(s.lines[1]).toMatchObject({ base: 500, fringe: 0, planned: 500 });
    expect(s.totals.planned).toBe(1715);
    expect(s.totals.left).toBe(515);
  });
});
