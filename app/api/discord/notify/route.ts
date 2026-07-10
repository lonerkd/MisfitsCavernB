import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/api-rate-limit';

// One-way Lounge -> Discord announce bridge. The webhook URL for a channel
// lives in discord_integrations, which has no SELECT RLS policy at all — the
// only thing that can ever read it back is this route, using the
// service-role key to bypass RLS entirely. Never forward the URL itself in
// any response; this route only ever returns success/failure.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  // Rate limit: 30 requests per 60s per IP
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, { maxRequests: 30, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests' },
      { status: 429, headers: { 'X-RateLimit-Reset': rateLimit.resetAt.toString() } },
    );
  }

  // The caller must prove who they are: the sender's identity comes from the
  // verified JWT, never from the request body, so nobody can post to Discord
  // under someone else's username.
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { channelId?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { channelId, content } = body;
  if (!channelId || typeof channelId !== 'string' || !content || typeof content !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Authorization: re-check channel visibility as the caller, not as admin.
  // A user-scoped client runs under RLS, so can_view_channel() decides —
  // the same policy that gates the Lounge UI. Outsiders get a 403 here even
  // though the webhook lookup below runs with the service role.
  const supabaseAsUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );
  const { data: channel, error: channelError } = await supabaseAsUser
    .from('channels')
    .select('id')
    .eq('id', channelId)
    .maybeSingle();
  if (channelError || !channel) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('discord_integrations')
    .select('webhook_url')
    .eq('channel_id', channelId)
    .maybeSingle();

  // No webhook configured for this channel is the overwhelmingly common
  // case (most channels won't have one) — not an error, just a no-op.
  if (error || !data?.webhook_url) return NextResponse.json({ ok: true, bridged: false });

  let senderName = 'Misfits Cavern';
  const { data: profile } = await supabaseAdmin.from('profiles').select('username').eq('id', user.id).maybeSingle();
  if (profile?.username) senderName = profile.username;

  try {
    const discordRes = await fetch(data.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: (senderName || 'Misfits Cavern').slice(0, 80),
        content: content.slice(0, 2000), // Discord's hard message-length cap
      }),
    });
    // Discord webhook failures (rate limit, revoked URL, etc.) are logged
    // server-side only — never surfaced to the sender, since the Lounge
    // message itself already sent successfully and that's what matters to them.
    if (!discordRes.ok) console.error('Discord webhook post failed:', discordRes.status);
    return NextResponse.json({ ok: true, bridged: discordRes.ok });
  } catch (err) {
    console.error('Discord webhook post error:', err);
    return NextResponse.json({ ok: true, bridged: false });
  }
}
