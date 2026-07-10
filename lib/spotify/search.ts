import { getValidToken } from './auth';
import { parseScript } from '../scriptos/parser';

/**
 * Executes a search against the Spotify API.
 */
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

/**
 * Context-aware intelligent search.
 * Analyzes the text of a script scene to extract mood/emotion/setting,
 * then translates that into a high-quality Spotify search query for cinematic tracks.
 * 
 * In a real-world scenario with a backend, we'd pass this to an LLM or use NLP to extract 
 * keywords. Since this is client-side, we'll use a heuristic keyword matcher for the MVP.
 */
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
      keywords.push(...Array.from(sfx).slice(0, 3)); // Use top 3 SFX for Spotify search
    }
  } catch {
    // Fallback if parsing fails
  }

  // Mood heuristics
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

  // Base fallback if no matches
  if (keywords.length === 0) {
    keywords.push('Cinematic', 'Ambient', 'Score');
  } else {
    keywords.push('Cinematic Score'); // Always append cinematic
  }

  return keywords.join(' ');
}

export async function contextAwareSearch(sceneText: string) {
  const query = await generateContextualSearchQuery(sceneText);
  return searchSpotify(query, 'playlist');
}
