import { describe, it, expect } from 'vitest';
import { emptyDepth, consistencyWarnings } from './depth';

describe('character depth', () => {
  it('emptyDepth', () => {
    const d = emptyDepth('Maya');
    expect(d.name).toBe('Maya');
    expect(d.goals).toBe('');
  });
  it('warns on duplicate names', () => {
    const w = consistencyWarnings([emptyDepth('Maya'), emptyDepth('maya')]);
    expect(w.some((x) => /Duplicate/.test(x))).toBe(true);
  });
  it('warns on missing goal', () => {
    const w = consistencyWarnings([emptyDepth('Leo')]);
    expect(w.some((x) => /no goal/.test(x))).toBe(true);
  });
  it('clean when populated', () => {
    const d = emptyDepth('Ivy');
    d.goals = 'escape';
    d.flaws = 'pride';
    const w = consistencyWarnings([d]);
    expect(w).toHaveLength(0);
  });
});
