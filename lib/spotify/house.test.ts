import { describe, it, expect } from 'vitest';
import { HOUSE_PLAYLISTS } from './house';

describe('house playlists', () => {
  it('are the four, in order, all valid playlist references', () => {
    expect(HOUSE_PLAYLISTS.map((p) => p.name)).toEqual(['The Trophy', 'Misfits Cavern', 'Misfits Too', 'Solitude']);
    expect(HOUSE_PLAYLISTS.every((p) => p.ref.kind === 'playlist' && /^[A-Za-z0-9]{22}$/.test(p.ref.id))).toBe(true);
  });
});
