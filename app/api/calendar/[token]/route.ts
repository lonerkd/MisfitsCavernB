import { createClient } from '@supabase/supabase-js';
import { FEED_TOKEN, buildIcs, type FeedRow } from '@/lib/calendar/ics';

// A person's calendar feed: the link is the secret (a random uuid in `calendar_feeds`), so a calendar app can subscribe with
// no login. It reads through `calendar_feed(token)`, which returns only what that person may already see. An unknown token
// gets an empty calendar, the same as a person with nothing coming up, so a token cannot be tested for.

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const raw = (await ctx.params).token.replace(/\.ics$/i, '');
  const headers = { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=300' };
  if (!FEED_TOKEN.test(raw)) return new Response(buildIcs([]), { headers });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return new Response('Not configured', { status: 503 });
  const { data, error } = await createClient(url, key, { auth: { persistSession: false } }).rpc('calendar_feed', { p_token: raw });
  if (error) return new Response('The feed is unavailable right now', { status: 502 });
  return new Response(buildIcs((data ?? []) as FeedRow[]), { headers });
}
