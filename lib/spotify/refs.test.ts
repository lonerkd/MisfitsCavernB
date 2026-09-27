import { describe, it, expect } from 'vitest';
import { parseSpotifyRef, spotifyEmbedSrc } from './refs';

describe('parseSpotifyRef', () => {
  it('reads share links (with locale and tracking) and URIs', () => {
    expect(parseSpotifyRef('https://open.spotify.com/playlist/79HohMGeX0HuPvtaQDVwgN?si=abc')).toEqual({ kind: 'playlist', id: '79HohMGeX0HuPvtaQDVwgN' });
    expect(parseSpotifyRef('https://open.spotify.com/intl-de/album/4aawyAB9vmqN3uQ7FjRGTy')).toEqual({ kind: 'album', id: '4aawyAB9vmqN3uQ7FjRGTy' });
    expect(parseSpotifyRef('spotify:track:11dFghVXANMlKmJXsNCbNl')).toEqual({ kind: 'track', id: '11dFghVXANMlKmJXsNCbNl' });
  });
  it('refuses anything else', () => {
    expect(parseSpotifyRef('https://evil.example/playlist/79HohMGeX0HuPvtaQDVwgN')).toBeNull();
    expect(parseSpotifyRef('spotify:user:abc')).toBeNull();
    expect(parseSpotifyRef('https://open.spotify.com/playlist/../x')).toBeNull();
    expect(parseSpotifyRef(null)).toBeNull();
  });
  it('builds the embed', () => {
    expect(spotifyEmbedSrc({ kind: 'album', id: 'abcdefghij' })).toBe('https://open.spotify.com/embed/album/abcdefghij?utm_source=generator&theme=0');
  });
});
