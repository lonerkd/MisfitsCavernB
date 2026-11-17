import { describe, expect, it } from 'vitest';
import { undoPlan } from './record-undo';

const r = (id: string, v = 'x') => ({ id, v });

describe('undoPlan', () => {
  it('nothing changed, nothing to undo', () => {
    expect(undoPlan([r('a')], [r('a')])).toBeNull();
  });
  it('an added record is dropped again', () => {
    expect(undoPlan([r('a')], [r('a'), r('b')])).toEqual({ restore: [], drop: ['b'], label: 'Added an entry' });
  });
  it('an edited record goes back to how it was', () => {
    expect(undoPlan([r('a', 'old')], [r('a', 'new')])).toEqual({ restore: [r('a', 'old')], drop: [], label: 'Changed an entry' });
  });
  it('removed records are restored whole', () => {
    expect(undoPlan([r('a'), r('b'), r('c')], [r('b')])).toEqual({ restore: [r('a'), r('c')], drop: [], label: 'Removed 2 entries' });
  });
  it('a mixed save says each part and undoes each part', () => {
    const p = undoPlan([r('a', '1'), r('b')], [r('a', '2'), r('c')]);
    expect(p?.restore).toEqual([r('a', '1'), r('b')]);
    expect(p?.drop).toEqual(['c']);
    expect(p?.label).toBe('Removed an entry, Added an entry, Changed an entry');
  });
});
