import { describe, expect, it } from 'vitest';
import { approvedPoTotal, parseAmount } from './po-totals';

describe('purchase order amounts', () => {
  it('reads typed amounts tolerantly and ignores what is not a number', () => {
    expect(parseAmount('$1,500.50')).toBe(1500.5);
    expect(parseAmount('EUR 200')).toBe(200);
    expect(parseAmount('1,000')).toBe(1000);
    expect(parseAmount(42)).toBe(42);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('n/a')).toBeNull();
    expect(parseAmount('1.2.3')).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });

  it('sums only the approved and paid orders', () => {
    const pos = [
      { amount: '$1,000', status: 'approved' },
      { amount: '250', status: 'paid' },
      { amount: '9999', status: 'draft' },
    ];
    expect(approvedPoTotal(pos)).toBe(1250);
  });

  it('skips amounts it cannot read and gives zero for no orders', () => {
    expect(approvedPoTotal([{ amount: 'to be quoted', status: 'approved' }, { amount: '40', status: 'paid' }])).toBe(40);
    expect(approvedPoTotal([])).toBe(0);
  });
});
