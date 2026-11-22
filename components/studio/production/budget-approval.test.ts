import { describe, it, expect } from 'vitest';
import { approvalState } from './BudgetApproval';

const lines = [{ amount: 1000 }, { amount: 500 }];

describe('approvalState with fringes', () => {
  it('compares the fringed total, so a fringe applied after approval reads as changed', () => {
    expect(approvalState('2026-11-22T00:00:00Z', 1715, 2, [{ amount: 1000, fringe_amount: 215 }, { amount: 500 }])).toBe('approved');
    expect(approvalState('2026-11-22T00:00:00Z', 1500, 2, [{ amount: 1000, fringe_amount: 215 }, { amount: 500 }])).toBe('changed');
  });
});

describe('approvalState', () => {
  it('is none until the owner has approved', () => { expect(approvalState(null, null, null, lines)).toBe('none'); });
  it('is approved while the budget is what was approved', () => { expect(approvalState('2026-11-22T00:00:00Z', 1500, 2, lines)).toBe('approved'); });
  it('is changed when a line amount moves', () => { expect(approvalState('2026-11-22T00:00:00Z', 1500, 2, [{ amount: 1000 }, { amount: 600 }])).toBe('changed'); });
  it('is changed when a line is added or removed, even at the same total', () => {
    expect(approvalState('2026-11-22T00:00:00Z', 1500, 2, [{ amount: 1500 }])).toBe('changed');
    expect(approvalState('2026-11-22T00:00:00Z', 1500, 2, [{ amount: 1000 }, { amount: 400 }, { amount: 100 }])).toBe('changed');
  });
});
