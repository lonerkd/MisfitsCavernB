import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/api-rate-limit';
import { referenceSearchQuerySchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  // Open endpoint that fans out to a third-party API — cap it so it can't be
  // used to hammer Openverse (or us) from one client.
  const rateLimit = checkRateLimit(getClientIp(req), { maxRequests: 60, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { results: [], totalPages: 0, page: 1 },
      { status: 429, headers: { 'X-RateLimit-Reset': rateLimit.resetAt.toString() } },
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = referenceSearchQuerySchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    page: searchParams.get('page') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ results: [], totalPages: 0, page: 1 }, { status: 400 });
  }

  const { q, page: pageNum } = parsed.data;

  if (!q) return NextResponse.json({ results: [], totalPages: 0, page: 1 });

  try {
    const upstream = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page=${pageNum}&page_size=24&mature=false`,
      { headers: { 'User-Agent': 'MisfitsCavern/1.0 (reference-search)' }, next: { revalidate: 60 } }
    );

    if (!upstream.ok) {
      return NextResponse.json({ results: [], totalPages: 0, page: pageNum }, { status: 200 });
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
      page: pageNum,
    });
  } catch {
    return NextResponse.json({ results: [], totalPages: 0, page: pageNum }, { status: 200 });
  }
}
