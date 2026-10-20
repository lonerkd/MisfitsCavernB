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

  // Spotify compares the redirect string exactly. The string we send is always
  // built from the browser's own origin + the fixed path, never from the
  // configured value — the configured value only says which origin is allowed.
  it('emits exactly origin + callback path: no extra slash, path, query or port', () => {
    for (const origin of ['https://thecavern.app', 'https://thecavern.app/', 'https://thecavern.app/x?y=1#z']) {
      expect(spotifyRedirect(origin, 'https://thecavern.app')).toEqual({ uri: 'https://thecavern.app/auth/spotify-callback' });
    }
    expect(spotifyRedirect('http://127.0.0.1:3100/')).toEqual({ uri: 'http://127.0.0.1:3100/auth/spotify-callback' });
    expect(spotifyRedirect('http://[::1]:3100')).toEqual({ uri: 'http://[::1]:3100/auth/spotify-callback' });
  });

  it('never echoes the configured value into the emitted address', () => {
    // A sloppy env value (trailing slash, path) still only authorises its origin;
    // the emitted string is the page's own origin, so it is the same string every time.
    const r = spotifyRedirect('https://thecavern.app', 'https://thecavern.app/some/path/') as { uri: string };
    expect(r.uri).toBe('https://thecavern.app/auth/spotify-callback');
  });

  it('does not match a different host, scheme or port, or a bare-host configured value', () => {
    expect(spotifyRedirect('https://thecavern.app:8443', 'https://thecavern.app')).toHaveProperty('error');
    expect(spotifyRedirect('https://www.thecavern.app', 'https://thecavern.app')).toHaveProperty('error');
    expect(spotifyRedirect('http://thecavern.app', 'https://thecavern.app')).toHaveProperty('error');
    expect(spotifyRedirect('https://thecavern.app', 'thecavern.app')).toHaveProperty('error');
  });

  it('copes with a nonsense origin', () => {
    expect(spotifyRedirect('not a url')).toHaveProperty('error');
  });
});
