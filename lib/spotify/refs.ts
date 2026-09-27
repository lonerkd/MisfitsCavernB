// Spotify links and URIs → something the embed player can show.

export type SpotifyKind = 'playlist' | 'album' | 'track' | 'artist' | 'episode' | 'show';
export interface SpotifyRef { kind: SpotifyKind; id: string }

const KINDS = new Set<SpotifyKind>(['playlist', 'album', 'track', 'artist', 'episode', 'show']);

/** open.spotify.com/…/playlist/<id>?si=… or spotify:playlist:<id> → { kind, id }; null otherwise. */
export function parseSpotifyRef(value: string | null | undefined): SpotifyRef | null {
  const v = (value ?? '').trim();
  const uri = /^spotify:(\w+):([A-Za-z0-9]{10,40})$/.exec(v);
  if (uri && KINDS.has(uri[1] as SpotifyKind)) return { kind: uri[1] as SpotifyKind, id: uri[2] };
  try {
    const url = new URL(v);
    if (url.hostname !== 'open.spotify.com') return null;
    const parts = url.pathname.split('/').filter(Boolean).filter((p) => !p.startsWith('intl-') && p !== 'embed');
    const [kind, id] = parts;
    if (KINDS.has(kind as SpotifyKind) && /^[A-Za-z0-9]{10,40}$/.test(id ?? '')) return { kind: kind as SpotifyKind, id };
  } catch { /* not a URL */ }
  return null;
}

export const spotifyEmbedSrc = (r: SpotifyRef) => `https://open.spotify.com/embed/${r.kind}/${r.id}?utm_source=generator&theme=0`;
