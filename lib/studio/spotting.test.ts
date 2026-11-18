import { describe, expect, it } from 'vitest';
import { spotSummary, type Spot } from './spotting';

const spot = (o: Partial<Spot>): Spot => ({ id: 'x', scene: '1', tc: '', kind: 'effect', note: 'Rain', source: '', status: 'to spot', ...o });

describe('the spotting summary', () => {
  it('is empty for no items', () => {
    expect(spotSummary([])).toEqual({ total: 0, done: 0, scenes: 0, byKind: [] });
  });
  it('counts items, approved items, distinct scenes and the mix, most numerous first', () => {
    const s = spotSummary([
      spot({ id: 'a', kind: 'foley', status: 'approved' }),
      spot({ id: 'b', kind: 'foley', scene: '2' }),
      spot({ id: 'c', kind: 'ambience', scene: '2' }),
      spot({ id: 'd', kind: 'effect', scene: '', scene_ids: ['s9'] }),
      spot({ id: 'e', kind: 'effect', scene: ' 1 ' }),
    ]);
    expect(s.total).toBe(5);
    expect(s.done).toBe(1);
    expect(s.scenes).toBe(3); // scenes "1", "2" and the linked s9
    expect(s.byKind).toEqual([['effect', 2], ['foley', 2], ['ambience', 1]]);
  });
});
