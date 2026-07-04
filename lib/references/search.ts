// Visual reference search — the search layer behind the Studio "Reference Search"
// panel. Today it's backed by Openverse (free, no API key, CC-licensed imagery);
// the ReferenceResult shape is provider-agnostic so a ShotDeck / EyeCandy / Pinterest
// backend can be swapped in later without touching the UI.

export interface ReferenceResult {
  id: string;
  title: string;
  thumbnail: string;   // small image for the results grid
  url: string;         // full-resolution image to pin to a board
  source: string;      // provider name (e.g. "flickr")
  sourceUrl: string;   // link back to the original (attribution)
  creator?: string;
}

export interface ReferenceSearchResponse {
  results: ReferenceResult[];
  totalPages: number;
  page: number;
}

// Calls our own API route (keeps the upstream provider server-side, avoids CORS
// and browser rate-limit headaches).
export async function searchReferences(query: string, page = 1): Promise<ReferenceSearchResponse> {
  const q = query.trim();
  if (!q) return { results: [], totalPages: 0, page: 1 };

  const res = await fetch(`/api/references/search?q=${encodeURIComponent(q)}&page=${page}`);
  if (!res.ok) return { results: [], totalPages: 0, page };
  return res.json();
}
