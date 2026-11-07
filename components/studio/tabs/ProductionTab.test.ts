import { describe, expect, it } from 'vitest';
import { PRODUCTION_VIEWS } from '@/lib/os/progress';
import { GROUPS, VIEWS } from './ProductionTab';

describe('the Production tab’s tool list', () => {
  it('has a chip for every production view, once', () => {
    expect(VIEWS.map((v) => v.id).sort()).toEqual([...PRODUCTION_VIEWS].sort());
  });
  it('files every tool under a group that is shown, and no group is empty', () => {
    for (const v of VIEWS) expect(GROUPS).toContain(v.group);
    for (const g of GROUPS) expect(VIEWS.some((v) => v.group === g)).toBe(true);
  });
  it('keeps each group a scannable size', () => {
    for (const g of GROUPS) expect(VIEWS.filter((v) => v.group === g).length).toBeLessThanOrEqual(10);
  });
});
