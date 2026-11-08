import { describe, it, expect } from 'vitest';
import { arrange, move, togglePin, placements, MAX_PINNED } from './curation';

const P = (id: string, extra: { pinned?: boolean; position?: number; year?: number } = {}) => ({ id, ...extra });

describe('arranging a portfolio', () => {
  it('pinned first, then chosen position, then newest year, unarranged after arranged', () => {
    const list = [P('old', { year: 2019 }), P('new', { year: 2024 }), P('pos0', { position: 0, year: 2000 }), P('pin', { pinned: true, year: 1990 })];
    expect(arrange(list).map((p) => p.id)).toEqual(['pin', 'pos0', 'new', 'old']);
  });
  it('moves a piece one step within its group, and stays put at an end or a group edge', () => {
    const list = [P('a', { pinned: true, position: 0 }), P('b', { position: 1 }), P('c', { position: 2 })];
    expect(move(list, 'c', -1).map((p) => p.id)).toEqual(['a', 'c', 'b']);
    expect(move(list, 'b', -1).map((p) => p.id)).toEqual(['a', 'b', 'c']); // cannot cross into the pinned group
    expect(move(list, 'c', 1).map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(placements(move(list, 'c', -1)).map((x) => x.position)).toEqual([0, 1, 2]);
  });
  it('pins a piece to the end of the pinned group, unpins it, and refuses a fourth pin', () => {
    const list = [P('a', { pinned: true, position: 0 }), P('b', { position: 1 }), P('c', { position: 2 })];
    expect(togglePin(list, 'c')!.map((p) => `${p.id}${p.pinned ? '*' : ''}`)).toEqual(['a*', 'c*', 'b']);
    const full = Array.from({ length: MAX_PINNED + 1 }, (_, i) => P(`p${i}`, { pinned: i < MAX_PINNED, position: i }));
    expect(togglePin(full, `p${MAX_PINNED}`)).toBeNull();
    expect(togglePin(full, 'p0')!.find((p) => p.id === 'p0')!.pinned).toBe(false);
  });
});
