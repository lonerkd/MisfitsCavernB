import { describe, it, expect } from 'vitest';
import { fringeOn, fringeTotal, perDiemAmount, lineCost } from './fringes';

describe('fringes', () => {
  it('a percent of the base, to the cent', () => {
    expect(fringeOn(1000, { percent: 21.5, cap_per_line: null })).toBe(215);
    expect(fringeOn(333.33, { percent: 12.5, cap_per_line: null })).toBe(41.67);
    expect(fringeOn(0, { percent: 20, cap_per_line: null })).toBe(0);
  });
  it('a cap stops a fringe at that many dollars on one line', () => {
    expect(fringeOn(10000, { percent: 10, cap_per_line: 400 })).toBe(400);
    expect(fringeOn(1000, { percent: 10, cap_per_line: 400 })).toBe(100);
    expect(fringeOn(10000, { percent: 10, cap_per_line: 0 })).toBe(0);
  });
  it('fringes add up, each capped on its own', () => {
    const applied = [{ percent: 10, cap_per_line: 400 }, { percent: 5, cap_per_line: null }];
    expect(fringeTotal(10000, applied)).toBe(900);
    expect(fringeTotal(10000, [])).toBe(0);
  });
  it('a line costs its base plus its fringe; no fringe leaves it as it was', () => {
    expect(lineCost({ amount: '1000.00', fringe_amount: '215.00' })).toBe(1215);
    expect(lineCost({ amount: 750.5 })).toBe(750.5);
    expect(lineCost({ amount: null, fringe_amount: null })).toBe(0);
  });
  it('a per diem is days x rate x people', () => {
    expect(perDiemAmount(12, 55, 4)).toBe(2640);
    expect(perDiemAmount(2.5, 33.33, 3)).toBe(249.98);
    expect(perDiemAmount('', 55, 4)).toBe(0);
  });
});
