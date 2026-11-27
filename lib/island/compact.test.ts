import { describe, it, expect } from 'vitest';
import { islandSurface } from './compact';

describe('islandSurface', () => {
  it('a wide window always has the dock', () => {
    for (const v2 of [true, false]) for (const finePointer of [true, false]) expect(islandSurface({ v2, narrow: false, finePointer })).toBe('dock');
  });
  it('a narrow window with a mouse gets the compact dock only when island_v2 is on', () => {
    expect(islandSurface({ v2: true, narrow: true, finePointer: true })).toBe('compact-dock');
    expect(islandSurface({ v2: false, narrow: true, finePointer: true })).toBe('pill');
  });
  it('a narrow touch device gets the compact dock when island_v2 is on, and keeps the pill when it is off', () => {
    expect(islandSurface({ v2: true, narrow: true, finePointer: false })).toBe('compact-dock');
    expect(islandSurface({ v2: false, narrow: true, finePointer: false })).toBe('pill');
  });
});
