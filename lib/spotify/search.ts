import { getValidToken } from './auth';
import { parseScript } from '../scriptos/parser';

export async function searchSpotify(query: string, type: 'track' | 'playlist' | 'album' = 'playlist') {
  const token = await getValidToken();
  if (!token) throw new Error('Not authenticated with Spotify');

  const url = new URL('https://api.spotify.com/v1/search');
  url.searchParams.append('q', query);
  url.searchParams.append('type', type);
  url.searchParams.append('limit', '12');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error('Spotify search failed');
  }

  const data = await res.json();
  return type === 'playlist' ? data.playlists.items : (type === 'track' ? data.tracks.items : data.albums.items);
}

export async function generateContextualSearchQuery(sceneText: string): Promise<string> {
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

  return keywords.join(' ');
}

export async function contextAwareSearch(sceneText: string) {
  const query = await generateContextualSearchQuery(sceneText);
  return searchSpotify(query, 'playlist');
}
