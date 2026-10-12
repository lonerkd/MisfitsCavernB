// Where Spotify may send a person back to after they connect. Spotify only
// accepts redirect addresses registered, exactly, in the Spotify app's settings
// — over HTTPS, or on the loopback address 127.0.0.1 (it no longer accepts
// "localhost") — and the sign-in state is kept in the browser tab that started
// it, so the person must come back to the SAME site. Anywhere else, Spotify shows
// its own red "Invalid redirect URI" page; better to say so here, first.

export const SPOTIFY_CALLBACK_PATH = '/auth/spotify-callback';
/** The deployed site: the one https address registered with the Spotify app. */
export const PRODUCTION_ORIGIN = 'https://misfits-cavern-b.vercel.app';

export type SpotifyRedirect = { uri: string } | { error: string };

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' ? u.origin : null;
  } catch {
    return null;
  }
}

/**
 * `origin` is where the person is now (`window.location.origin`); `configured`
 * is NEXT_PUBLIC_APP_URL when set (a custom domain, once there is one).
 */
export function spotifyRedirect(origin: string, configured?: string): SpotifyRedirect {
  let url: URL;
  try { url = new URL(origin); } catch { return { error: 'Couldn’t tell which address this site is on.' }; }

  if (url.hostname === '127.0.0.1' || url.hostname === '[::1]') return { uri: `${url.origin}${SPOTIFY_CALLBACK_PATH}` };

  if (url.hostname === 'localhost') {
    const loopback = `${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ''}`;
    return { error: `Spotify no longer accepts “localhost”. Open this site at ${loopback} and connect from there (and add ${loopback}${SPOTIFY_CALLBACK_PATH} to the Spotify app’s Redirect URIs).` };
  }

  const allowed = new Set([PRODUCTION_ORIGIN, originOf(configured)].filter((o): o is string => !!o));
  if (allowed.has(url.origin)) return { uri: `${url.origin}${SPOTIFY_CALLBACK_PATH}` };

  return { error: `Spotify can only send you back to ${[...allowed][0]}. Open the app there to connect Spotify.` };
}
