import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/api-rate-limit';
import { discordTestBodySchema, parseJsonBody } from '@/lib/validation';

// Validates a candidate Discord webhook URL before it's ever saved to
// discord_integrations. Runs server-side (not in the browser) purely so a
// user's URL never needs a client-side CORS-permissive fetch to Discord —
// same server-only posture as app/api/discord/notify, just for the one-time
// "does this actually work" check instead of a real message post.
//
// Without this, ManageChannelModal's CONNECT button saved whatever the user
// pasted with zero validation: a typo'd URL, a non-Discord URL, or a webhook
// that had since been deleted in Discord's own settings would all show
// "● Connected" and then silently fail to bridge every message forever,
// since app/api/discord/notify's failures only ever reach a server log, not
// the sender.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, { maxRequests: 20, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests' },
      { status: 429, headers: { 'X-RateLimit-Reset': rateLimit.resetAt.toString() } },
    );
  }

  // Signed-in users only. Without this the route is an anonymous outbound
  // fetch primitive — anyone could use it to probe URLs from our server.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { data: userData, error: authError } = await createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).auth.getUser(token);
  if (authError || !userData?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, discordTestBodySchema);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  try {
    // GET on a webhook URL returns the webhook's own metadata (name, channel
    // id) if it's live, or a 401/404 if it's been deleted/revoked — cheaper
    // and less noisy in the target channel than posting a real test message.
    const res = await fetch(parsed.data.webhookUrl, { method: 'GET' });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'Discord rejected that webhook (it may have been deleted or the URL is wrong).' });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not reach Discord to verify the webhook. Check the URL and try again.' });
  }
}
