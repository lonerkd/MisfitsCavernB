import { describe, expect, it } from 'vitest';
import { PRODUCTION_ORIGIN, spotifyRedirect } from './redirect';

describe('spotifyRedirect', () => {
  it('sends the deployed site back to itself', () => {
    expect(spotifyRedirect(PRODUCTION_ORIGIN)).toEqual({ uri: `${PRODUCTION_ORIGIN}/auth/spotify-callback` });
  });

  it('accepts a configured custom domain, https only', () => {
    expect(spotifyRedirect('https://thecavern.app', 'https://thecavern.app')).toEqual({ uri: 'https://thecavern.app/auth/spotify-callback' });
    expect(spotifyRedirect('http://thecavern.app', 'http://thecavern.app')).toHaveProperty('error');
  });

  it('accepts the loopback address on any port, over http', () => {
    expect(spotifyRedirect('http://127.0.0.1:3100')).toEqual({ uri: 'http://127.0.0.1:3100/auth/spotify-callback' });
  });

  it('explains localhost, and the address to use instead', () => {
    const r = spotifyRedirect('http://localhost:3100');
    expect(r).toHaveProperty('error');
    expect((r as { error: string }).error).toContain('http://127.0.0.1:3100/auth/spotify-callback');
  });

  it('refuses a preview or any other site, and names the one that works', () => {
    const r = spotifyRedirect('https://misfits-cavern-abc123-peters-projects-4575517e.vercel.app');
    expect((r as { error: string }).error).toContain(PRODUCTION_ORIGIN);
  });

  it('copes with a nonsense origin', () => {
    expect(spotifyRedirect('not a url')).toHaveProperty('error');
  });
});
