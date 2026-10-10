import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/util/api-rate-limit';
import { oembedEndpoint, pinterestBoardFeed, readOembed, readPinterestRss } from '@/lib/integrations/links';

// What a pasted link is, from public sources (lib/integrations/links): a
// YouTube/Vimeo video's real title and thumbnail, or a public Pinterest
// board's pins. Only ever fetches the fixed provider endpoints built from a
// checked address — never the address itself — so it can't be pointed
// anywhere else.

const MAX_BYTES = 2_000_000;

async function fetchText(url: string, accept: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: accept, 'User-Agent': 'MisfitsCavern/1.0 (link-details)' },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > MAX_BYTES ? null : text;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(getClientIp(req), { maxRequests: 30, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ type: 'none' }, { status: 429, headers: { 'X-RateLimit-Reset': rateLimit.resetAt.toString() } });
  }
  const url = new URL(req.url).searchParams.get('url') ?? '';
  if (!url || url.length > 2000) return NextResponse.json({ type: 'none' }, { status: 400 });

  const oembed = oembedEndpoint(url);
  if (oembed) {
    const text = await fetchText(oembed, 'application/json');
    let details = null;
    try { details = text ? readOembed(JSON.parse(text)) : null; } catch { details = null; }
    return NextResponse.json(details ? { type: 'video', details } : { type: 'none' });
  }

  const feed = pinterestBoardFeed(url);
  if (feed) {
    const xml = await fetchText(feed, 'application/rss+xml, application/xml');
    if (!xml) return NextResponse.json({ type: 'board', board: null, pins: [], error: 'That board is private, empty, or Pinterest didn’t answer.' });
    return NextResponse.json({ type: 'board', ...readPinterestRss(xml) });
  }

  return NextResponse.json({ type: 'none' });
}
