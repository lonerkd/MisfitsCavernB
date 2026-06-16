import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy to the Openverse image API. Keeps the upstream provider
// server-side so the browser never hits CORS / rate-limit issues, and gives us
// a single seam to swap in ShotDeck/EyeCandy/Pinterest later.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const page = searchParams.get('page') || '1';

  if (!q) return NextResponse.json({ results: [], totalPages: 0, page: 1 });

  try {
    const upstream = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page=${page}&page_size=24&mature=false`,
      { headers: { 'User-Agent': 'MisfitsCavern/1.0 (reference-search)' }, next: { revalidate: 60 } }
    );

    if (!upstream.ok) {
      return NextResponse.json({ results: [], totalPages: 0, page: Number(page) }, { status: 200 });
    }

    const data = await upstream.json();
    const results = (data.results || [])
      .filter((r: any) => r.url)
      .map((r: any) => ({
        id: r.id,
        title: r.title || 'Untitled',
        thumbnail: r.thumbnail || r.url,
        url: r.url,
        source: r.source || r.provider || 'web',
        sourceUrl: r.foreign_landing_url || r.url,
        creator: r.creator || undefined,
      }));

    return NextResponse.json({
      results,
      totalPages: data.page_count || 1,
      page: Number(page),
    });
  } catch {
    return NextResponse.json({ results: [], totalPages: 0, page: Number(page) }, { status: 200 });
  }
}
