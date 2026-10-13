import { describe, it, expect } from 'vitest';
import { describeSpotifyFailure } from './failure';

describe('describeSpotifyFailure', () => {
  it('names the likely cause', () => {
    expect(describeSpotifyFailure(401)).toMatch(/Connect it again/);
    expect(describeSpotifyFailure(403)).toMatch(/User Management/);
    expect(describeSpotifyFailure(403, { error: { message: 'Active premium subscription required for the owner of the app' } })).toMatch(/Premium/);
    expect(describeSpotifyFailure(429)).toMatch(/rate-limiting/);
    expect(describeSpotifyFailure(503)).toMatch(/trouble/);
    expect(describeSpotifyFailure(400, { error: 'Invalid limit' })).toMatch(/search size/);
    expect(describeSpotifyFailure(404)).toBe('Spotify search failed (404).');
  });
});
