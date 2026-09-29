import { supabase } from '../supabase/client';
import { awaitOSUser } from '@/lib/os';

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';

function getRedirectUri() {
  if (typeof window !== 'undefined' && window.location.origin.includes('localhost')) {
    return `${window.location.origin}/auth/spotify-callback`;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://misfits-cavern-b.vercel.app';
  return `${baseUrl}/auth/spotify-callback`;
}

// PKCE verifier / OAuth state: must be unguessable, so crypto randomness only,
// and uniform — bytes ≥ 248 are dropped so no character is likelier (256 % 62).
function generateRandomString(length: number) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const limit = 256 - (256 % possible.length);
  let out = '';
  while (out.length < length) {
    for (const b of window.crypto.getRandomValues(new Uint8Array(length))) {
      if (b < limit && out.length < length) out += possible[b % possible.length];
    }
  }
  return out;
}

// Local token copies belong to one app user. Signing out (by any route) and
// signing in as someone else must never hand them the previous Spotify account.
const OWNER_KEY = 'spotify_owner';
const TOKEN_KEYS = ['spotify_access_token', 'spotify_refresh_token', 'spotify_token_expires_at'];
function clearLocalTokens() {
  for (const k of [...TOKEN_KEYS, OWNER_KEY]) window.localStorage.removeItem(k);
}

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function persistTokens(accessToken: string, refreshToken: string | undefined, expiresAt: number) {
  const user = await awaitOSUser();
  if (!user) return;
  window.localStorage.setItem(OWNER_KEY, user.id);
  window.localStorage.setItem('spotify_access_token', accessToken);
  if (refreshToken) {
    window.localStorage.setItem('spotify_refresh_token', refreshToken);
  }
  window.localStorage.setItem('spotify_token_expires_at', expiresAt.toString());

  try {
    const storedRefreshToken = refreshToken || window.localStorage.getItem('spotify_refresh_token');
    if (!storedRefreshToken) return;
    await supabase.from('spotify_connections').upsert({
      user_id: user.id,
      access_token: accessToken,
      refresh_token: storedRefreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
  } catch {

  }
}

export async function redirectToSpotifyAuth() {
  const verifier = generateRandomString(128);
  const challenge = await generateCodeChallenge(verifier);
  const state = generateRandomString(32);

  window.sessionStorage.setItem('spotify_code_verifier', verifier);
  window.sessionStorage.setItem('spotify_oauth_state', state);

  const scope = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private';
  const authUrl = new URL('https://accounts.spotify.com/authorize');

  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', getRedirectUri());
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('code_challenge', challenge);
  authUrl.searchParams.append('scope', scope);
  authUrl.searchParams.append('state', state);

  window.location.href = authUrl.toString();
}

/**
 * Finishes the Spotify sign-in. `state` must be the one this tab sent —
 * otherwise someone could link their Spotify account to your session.
 */
export async function getAccessToken(code: string, state: string | null): Promise<string> {
  const verifier = window.sessionStorage.getItem('spotify_code_verifier');
  const expected = window.sessionStorage.getItem('spotify_oauth_state');
  window.sessionStorage.removeItem('spotify_code_verifier');
  window.sessionStorage.removeItem('spotify_oauth_state');

  if (!verifier || !expected || state !== expected) {
    throw new Error('This Spotify sign-in didn’t start here (or already finished). Connect again from Soundtrack.');
  }

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', getRedirectUri());
  params.append('code_verifier', verifier);

  const result = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!result.ok) {
    const err = await result.json();
    throw new Error(err.error_description || err.error || 'Failed to get token');
  }

  const data = await result.json();
  const expiresAt = Date.now() + (data.expires_in * 1000);

  await persistTokens(data.access_token, data.refresh_token, expiresAt);

  return data.access_token;
}

async function refreshWithToken(refreshToken: string): Promise<string | null> {
  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);

  try {
    const result = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    if (!result.ok) return null;

    const data = await result.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);

    await persistTokens(data.access_token, data.refresh_token || refreshToken, expiresAt);

    return data.access_token;
  } catch (error) {
    return null;
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = window.localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return null;
  return refreshWithToken(refreshToken);
}

async function loadTokensFromAccount(): Promise<string | null> {
  try {
    const user = await awaitOSUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('spotify_connections')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error || !data) return null;

    if (Date.now() < data.expires_at - 60000) {
      window.localStorage.setItem(OWNER_KEY, user.id);
      window.localStorage.setItem('spotify_access_token', data.access_token);
      window.localStorage.setItem('spotify_refresh_token', data.refresh_token);
      window.localStorage.setItem('spotify_token_expires_at', data.expires_at.toString());
      return data.access_token;
    }

    return refreshWithToken(data.refresh_token);
  } catch {
    return null;
  }
}

export async function getValidToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const user = await awaitOSUser();
  if (!user) { clearLocalTokens(); return null; }
  if (window.localStorage.getItem(OWNER_KEY) !== user.id) clearLocalTokens();
  const token = window.localStorage.getItem('spotify_access_token');
  const expiresAtStr = window.localStorage.getItem('spotify_token_expires_at');

  if (!token || !expiresAtStr) return loadTokensFromAccount();

  const expiresAt = parseInt(expiresAtStr, 10);
  if (Date.now() > expiresAt - 60000) {

    return refreshAccessToken();
  }

  return token;
}

export function logoutSpotify() {
  if (typeof window === 'undefined') return;
  clearLocalTokens();
  window.dispatchEvent(new Event('spotify-auth-changed'));

  awaitOSUser().then((user) => {
    if (!user) return;
    supabase.from('spotify_connections').delete().eq('user_id', user.id).then(() => {});
  });
}
