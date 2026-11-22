import { describe, expect, it } from 'vitest';
import { diffArrays } from './array-diff';

const lcs = (a: string[], b: string[]) => {
  const t = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1]);
  return t[a.length][b.length];
};
let seed = 7;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };

describe('diffArrays (Myers, bounded)', () => {
  it('is empty-safe and identical-safe', () => {
    expect(diffArrays([], [], 10)).toEqual([]);
    expect(diffArrays(['a', 'b'], ['a', 'b'], 10)).toEqual([{ value: ['a', 'b'] }]);
    expect(diffArrays([], ['a'], 10)).toEqual([{ value: ['a'], added: true }]);
    expect(diffArrays(['a'], [], 10)).toEqual([{ value: ['a'], removed: true }]);
  });

  it('puts the removed lines before the added ones in a changed stretch', () => {
    expect(diffArrays(['a', 'x', 'c'], ['a', 'y', 'c'], 10)).toEqual([{ value: ['a'] }, { value: ['x'], removed: true }, { value: ['y'], added: true }, { value: ['c'] }]);
  });

  it('gives up past the edit bound', () => {
    expect(diffArrays(['a', 'b', 'c', 'd'], ['w', 'x', 'y', 'z'], 3)).toBeNull();
  });

  it('on random inputs: the parts rebuild both sides, and the equal lines are a longest common subsequence', () => {
    for (let round = 0; round < 300; round++) {
      const alphabet = 1 + rnd(5);
      const a = Array.from({ length: rnd(14) }, () => String(rnd(alphabet)));
      const b = Array.from({ length: rnd(14) }, () => String(rnd(alphabet)));
      const parts = diffArrays(a, b, 100)!;
      expect(parts).not.toBeNull();
      expect(parts.flatMap((p) => (p.added ? [] : p.value))).toEqual(a);
      expect(parts.flatMap((p) => (p.removed ? [] : p.value))).toEqual(b);
      const common = parts.filter((p) => !p.added && !p.removed).reduce((s, p) => s + p.value.length, 0);
      expect(common).toBe(lcs(a, b));
    }
  });

  it('a long mostly-equal script is cheap', () => {
    const a = Array.from({ length: 6000 }, (_, i) => `line ${i}`);
    const b = a.slice(0, 3000).concat(['inserted'], a.slice(3000, 5990), ['tail']);
    const t0 = performance.now();
    expect(diffArrays(a, b, 2500)).not.toBeNull();
    expect(performance.now() - t0).toBeLessThan(2000);
  });
});
