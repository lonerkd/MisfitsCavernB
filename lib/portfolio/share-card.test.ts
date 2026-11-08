import { describe, it, expect } from 'vitest';
import { shareCardText } from './share-card';

const p = { username: 'maya', role: 'Director', location: 'Lisbon', bio: null, avatar_url: null, status: null };

describe('the portfolio share card text', () => {
  it('says the name, what they do and where, and how much public work there is', () => {
    expect(shareCardText(p, 3, 1)).toEqual({ name: 'maya', line: 'Director · Lisbon', count: '3 pieces · 1 credit' });
  });
  it('says nothing about work there is none of', () => {
    expect(shareCardText(p, 0, 0).count).toBe('');
    expect(shareCardText(p, 1, 0).count).toBe('1 piece');
  });
  it('clips a very long name and line', () => {
    const t = shareCardText({ ...p, username: 'x'.repeat(100), role: 'y'.repeat(200), location: null }, 0, 0);
    expect(t.name.length).toBe(40);
    expect(t.line.length).toBe(80);
    expect(t.name.endsWith('…')).toBe(true);
  });
});
