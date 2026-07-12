

export interface ReferenceResult {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  source: string;
  sourceUrl: string;
  creator?: string;
}

export interface ReferenceSearchResponse {
  results: ReferenceResult[];
  totalPages: number;
  page: number;
}

export async function searchReferences(query: string, page = 1): Promise<ReferenceSearchResponse> {
  const q = query.trim();
  if (!q) return { results: [], totalPages: 0, page: 1 };

  const res = await fetch(`/api/references/search?q=${encodeURIComponent(q)}&page=${page}`);
  if (!res.ok) return { results: [], totalPages: 0, page };
  return res.json();
}
