import { describe, expect, it } from 'vitest';
import { countKeyUse, readKeyUse } from './keyUse';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('keyUse', () => {
  it('counts presses per key and control', () => {
    const s = mem();
    countKeyUse('q', 'new-project', s);
    countKeyUse('q', 'new-project', s);
    countKeyUse('e', 'find', s);
    expect(readKeyUse(s)).toEqual({ 'q:new-project': 2, 'e:find': 1 });
  });
  it('survives bad stored data and a failing store', () => {
    expect(readKeyUse({ getItem: () => 'nope' })).toEqual({});
    expect(() => countKeyUse('q', 'x', { getItem: () => null, setItem: () => { throw new Error('full'); } })).not.toThrow();
  });
});
