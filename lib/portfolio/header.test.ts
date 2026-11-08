import { describe, expect, it } from 'vitest';
import { headerOf, isCoverUrl } from './header';

const me = { username: 'mara', role: 'Director of photography', location: 'Lisbon', bio: 'Shoots on 16mm.', avatar_url: 'https://x/a.png', status: 'OPEN' };

describe('the top of a portfolio', () => {
  it('is the person: name, what they do and where, their bio, their availability', () => {
    expect(headerOf(me)).toEqual({ name: 'mara', line: 'Director of photography · Lisbon', bio: 'Shoots on 16mm.', avatarUrl: 'https://x/a.png', openToWork: true, sparse: false });
  });
  it('says only what they have said', () => {
    expect(headerOf({ ...me, location: null }).line).toBe('Director of photography');
    expect(headerOf({ ...me, role: ' ', location: 'Lisbon' }).line).toBe('Lisbon');
    expect(headerOf({ ...me, status: 'BUSY' }).openToWork).toBe(false);
  });
  it('is never a made-up name: no profile means a plain label, and a bare profile is marked sparse', () => {
    expect(headerOf(null)).toMatchObject({ name: 'Your portfolio', line: '', bio: '', avatarUrl: null, openToWork: false, sparse: true });
    expect(headerOf({ username: 'kim', role: null, location: null, bio: null, avatar_url: null, status: null }).sparse).toBe(true);
  });
});

describe('a cover link', () => {
  it('takes an https link and nothing else', () => {
    expect(isCoverUrl('https://images.example.com/still.jpg')).toBe(true);
    expect(isCoverUrl('  https://images.example.com/still.jpg  ')).toBe(true);
    for (const bad of ['http://images.example.com/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'not a url', 'https://localhost/a.jpg', '', 'https://x.example/' + 'a'.repeat(2000)]) expect(isCoverUrl(bad)).toBe(false);
  });
});
