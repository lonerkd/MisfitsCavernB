import { describe, it, expect } from 'vitest';
import { money, moneySummary } from './money';

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
      { id: 'cam', label: 'Camera — Lenses', planned: 1000, committed: 400, paid: 250.5, left: 349.5 },
      { id: 'loc', label: 'Locations', planned: 500, committed: 0, paid: 600, left: -100 },
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
