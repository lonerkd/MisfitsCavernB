import { describe, it, expect } from 'vitest';
import { emptyWorld, addLocation } from './world';

describe('world', () => {
  it('empty', () => {
    const w = emptyWorld('p1');
    expect(w.locations).toHaveLength(0);
  });
  it('add location immutable', () => {
    const w = emptyWorld('p1');
    const w2 = addLocation(w, { id: '1', name: 'Cave', description: '', mood: '' });
    expect(w2.locations).toHaveLength(1);
    expect(w.locations).toHaveLength(0);
  });
});
