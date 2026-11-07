import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/util/api-rate-limit';
import { buildFilmsQuery, parseFilms, isEntityId, FILM_SEARCH_BY, type FilmSearchBy } from '@/lib/references/films';
import { referenceSearchQuerySchema } from '@/lib/validation';

// Film search: a title, a director or a cinematographer, answered from Wikidata (open data, no key). The search
// words go to Wikidata and nowhere else; the privacy page says so.
const UA = 'MisfitsCavern/1.0 (film reference search; https://misfits-cavern-b.vercel.app)';
const EMPTY = (by: FilmSearchBy) => ({ films: [], by });

export async function GET(req: NextRequest) {
  const limit = checkRateLimit(getClientIp(req), { maxRequests: 30, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json(EMPTY('title'), { status: 429, headers: { 'X-RateLimit-Reset': limit.resetAt.toString() } });

  const { searchParams } = new URL(req.url);
  const parsed = referenceSearchQuerySchema.safeParse({ q: searchParams.get('q') ?? undefined });
  const by = FILM_SEARCH_BY.find((b) => b === searchParams.get('by')) ?? 'title';
  if (!parsed.success) return NextResponse.json(EMPTY(by), { status: 400 });
  const q = parsed.data.q;
  if (!q) return NextResponse.json(EMPTY(by));

  try {
    const found = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=en&uselang=en&type=item&limit=${by === 'title' ? 10 : 3}&format=json&origin=*`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } },
    );
    if (!found.ok) return NextResponse.json({ ...EMPTY(by), unavailable: true });
    const ids = ((await found.json()).search ?? []).map((h: { id?: string }) => h.id).filter(isEntityId) as string[];
    if (!ids.length) return NextResponse.json(EMPTY(by));

    const sparql = await fetch(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(buildFilmsQuery(by, ids))}`,
      { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' }, signal: AbortSignal.timeout(12000), next: { revalidate: 3600 } },
    );
    if (!sparql.ok) return NextResponse.json({ ...EMPTY(by), unavailable: true });
    return NextResponse.json({ films: parseFilms(await sparql.json()), by });
  } catch {
    return NextResponse.json({ ...EMPTY(by), unavailable: true });
  }
}
