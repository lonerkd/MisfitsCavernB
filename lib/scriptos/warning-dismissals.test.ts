import { describe, it, expect } from 'vitest';
import { readDismissed, writeDismissed } from './warning-dismissals';

const fake = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };

describe('dismissed character warnings', () => {
  it('round-trips per script', () => {
    const st = fake();
    expect(writeDismissed('s1', new Set(['single-line:BEN']), st)).toBe(true);
    expect([...readDismissed('s1', st)]).toEqual(['single-line:BEN']);
    expect(readDismissed('s2', st).size).toBe(0);
  });
  it('survives junk, a missing store and a store that throws', () => {
    const st = fake();
    st.setItem('mc.charwarn.dismissed.s1', '{not json');
    expect(readDismissed('s1', st).size).toBe(0);
    st.setItem('mc.charwarn.dismissed.s1', '[1,"a"]');
    expect([...readDismissed('s1', st)]).toEqual(['a']);
    expect(readDismissed('s1', null).size).toBe(0);
    expect(writeDismissed('s1', new Set(['a']), { getItem: () => null, setItem: () => { throw new Error('full'); } })).toBe(false);
    expect(writeDismissed('', new Set(['a']), st)).toBe(false);
  });
});
