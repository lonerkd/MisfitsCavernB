import { supabase } from '../supabase/client';

const CLIENT_ID = '488c7b9a4ad043d8a93a1dc829598aae';

function getRedirectUri() {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/auth/spotify-callback`;
}

function generateRandomString(length: number) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Persist to localStorage (fast, synchronous read path) AND to the account's
// spotify_connections row (survives across devices/browsers) — every other
// piece of state in this suite is account-scoped, not browser-scoped, and
// Spotify auth shouldn't be the one exception. Best-effort: a signed-out or
// offline Supabase write never blocks the local session from working.
async function persistTokens(accessToken: string, refreshToken: string | undefined, expiresAt: number) {
  window.localStorage.setItem('spotify_access_token', accessToken);
  if (refreshToken) {
    window.localStorage.setItem('spotify_refresh_token', refreshToken);
  }
  window.localStorage.setItem('spotify_token_expires_at', expiresAt.toString());

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const storedRefreshToken = refreshToken || window.localStorage.getItem('spotify_refresh_token');
    if (!storedRefreshToken) return; // the table requires a refresh token; nothing to persist yet
    await supabase.from('spotify_connections').upsert({
      user_id: user.id,
      access_token: accessToken,
      refresh_token: storedRefreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal — the local session still works from localStorage alone.
  }
}

export async function redirectToSpotifyAuth() {
  const verifier = generateRandomString(128);
  const challenge = await generateCodeChallenge(verifier);

  window.localStorage.setItem('spotify_code_verifier', verifier);

  const scope = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state';
  const authUrl = new URL('https://accounts.spotify.com/authorize');

  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', getRedirectUri());
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('code_challenge', challenge);
  authUrl.searchParams.append('scope', scope);

  window.location.href = authUrl.toString();
}

export async function getAccessToken(code: string): Promise<string> {
  const verifier = window.localStorage.getItem('spotify_code_verifier');

  if (!verifier) {
    throw new Error('No code verifier found in local storage.');
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

    // Spotify doesn't always return a new refresh_token — keep the one we
    // already have if it didn't send one, so the account row stays valid.
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

// A new device/browser has no localStorage entry at all — check the account's
// real connection row before concluding the user isn't connected.
async function loadTokensFromAccount(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('spotify_connections')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .single();
    if (error || !data) return null;

    // Still valid — cache locally and use it as-is.
    if (Date.now() < data.expires_at - 60000) {
      window.localStorage.setItem('spotify_access_token', data.access_token);
      window.localStorage.setItem('spotify_refresh_token', data.refresh_token);
      window.localStorage.setItem('spotify_token_expires_at', data.expires_at.toString());
      return data.access_token;
    }

    // Expired — refresh using the account's stored refresh token.
    return refreshWithToken(data.refresh_token);
  } catch {
    return null;
  }
}

export async function getValidToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem('spotify_access_token');
  const expiresAtStr = window.localStorage.getItem('spotify_token_expires_at');

  if (!token || !expiresAtStr) return loadTokensFromAccount();

  const expiresAt = parseInt(expiresAtStr, 10);
  if (Date.now() > expiresAt - 60000) {
    // Token is expired or about to expire in 1 minute, refresh it
    return refreshAccessToken();
  }

  return token;
}

export function logoutSpotify() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('spotify_access_token');
  window.localStorage.removeItem('spotify_refresh_token');
  window.localStorage.removeItem('spotify_token_expires_at');
  window.localStorage.removeItem('spotify_code_verifier');
  window.dispatchEvent(new Event('spotify-auth-changed'));

  // Disconnect the account too, not just this browser's cache — otherwise
  // "Disconnect" here would silently reconnect on the next page load via
  // loadTokensFromAccount() reading the still-live Supabase row.
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    supabase.from('spotify_connections').delete().eq('user_id', user.id).then(() => {});
  });
}
