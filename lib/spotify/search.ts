import { getValidToken } from './auth';
import { describeSpotifyFailure } from './failure';
import { parseScript } from '../scriptos/parser';

export async function searchSpotify(query: string, type: 'track' | 'playlist' | 'album' = 'playlist', offset = 0) {
  const token = await getValidToken();
  if (!token) throw new Error('Not authenticated with Spotify');

  const url = new URL('https://api.spotify.com/v1/search');
  url.searchParams.append('q', query);
  url.searchParams.append('type', type);
  // Development Mode apps may ask for at most 10.
  url.searchParams.append('limit', '10');
  if (offset > 0) url.searchParams.append('offset', String(Math.min(offset, 90)));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error('Spotify search failed');
  }

  const data = await res.json();
  const items = (type === 'playlist' ? data.playlists?.items : type === 'track' ? data.tracks?.items : data.albums?.items) ?? [];
  // Spotify returns null placeholders for items it won't serve (e.g. removed playlists).
  return items.filter(Boolean);
}

/** The words the scene's content suggests (sound effects it names, and its mood), before any are chosen for a query. */
export function contextKeywords(sceneText: string): string[] {
  const text = sceneText.toLowerCase();

  const keywords: string[] = [];

  try {
    const parsed = parseScript(sceneText);
    const sfx = new Set<string>();
    parsed.scenes.forEach(sc => {
      (sc.elements?.sfx || []).forEach(s => sfx.add(s));
    });

    if (sfx.size > 0) {
      keywords.push(...Array.from(sfx).slice(0, 3));
    }
  } catch {

  }

  if (text.match(/\b(gun|shoot|run|fast|chase|explosion|fight)\b/)) {
    keywords.push('Action', 'Tense', 'Fast');
  }
  if (text.match(/\b(dark|shadow|creep|quiet|sudden|blood|scream|scary)\b/)) {
    keywords.push('Horror', 'Dark Ambient', 'Eerie');
  }
  if (text.match(/\b(cry|tears|sad|heartbreak|loss|alone|grief)\b/)) {
    keywords.push('Emotional', 'Melancholy', 'Strings');
  }
  if (text.match(/\b(space|stars|alien|future|cyber|neon|tech)\b/)) {
    keywords.push('Cyberpunk', 'Synthwave', 'Sci-fi');
  }
  if (text.match(/\b(kiss|love|romantic|soft|gentle|warm)\b/)) {
    keywords.push('Romantic', 'Acoustic', 'Soft');
  }

  if (keywords.length === 0) {
    keywords.push('Cinematic', 'Ambient', 'Score');
  } else {
    keywords.push('Cinematic Score');
  }

  return keywords;
}

export async function generateContextualSearchQuery(sceneText: string): Promise<string> {
  return contextKeywords(sceneText).join(' ');
}

/**
 * A different take on the same scene each time: with a seed, the keywords are shuffled and a share of them is chosen (never fewer
 * than two), and the results start further down Spotify's list. Seed 0 is the plain query and the first page, so what opens by
 * itself stays steady; Refresh passes a new seed and so offers a fresh set, mostly (the same song can still turn up).
 */
export function freshSearch(keywords: string[], seed: number): { query: string; offset: number } {
  if (seed === 0 || keywords.length === 0) return { query: keywords.join(' '), offset: 0 };
  let s = (Math.abs(Math.floor(seed)) % 2147483647) || 1;
  const next = () => { s = (s * 48271) % 2147483647; return s / 2147483647; };
  const pool = [...keywords];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const take = Math.min(pool.length, Math.max(2, Math.ceil(pool.length * (0.5 + next() * 0.3))));
  return { query: pool.slice(0, take).join(' '), offset: Math.floor(next() * 8) * 10 };
}



export async function contextAwareSearch(sceneText: string) {
  const query = await generateContextualSearchQuery(sceneText);
  return searchSpotify(query, 'playlist');
}

/** The signed-in listener's own playlists (public ones unless they granted playlist-read-private). */
export async function myPlaylists(limit = 20): Promise<Array<{ id: string; name: string; owner: string | null }>> {
  const token = await getValidToken();
  if (!token) return [];
  const res = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []).filter(Boolean).map((p: any) => ({ id: String(p.id), name: String(p.name ?? 'Playlist'), owner: p.owner?.display_name ?? null }));
}
