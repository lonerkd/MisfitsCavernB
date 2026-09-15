import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/api-rate-limit';
import { discordNotifyBodySchema, discordWebhookUrlSchema, parseJsonBody } from '@/lib/validation';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });
  }

  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip, { maxRequests: 30, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests' },
      { status: 429, headers: { 'X-RateLimit-Reset': rateLimit.resetAt.toString() } },
    );
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, discordNotifyBodySchema);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const { channelId, content } = parsed.data;

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });
  }

  const supabaseAsUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey,
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

  if (error || !data?.webhook_url) return NextResponse.json({ ok: true, bridged: false });

  // Re-validate the stored URL before fetching it. Rows are written through
  // /api/discord/test, but a direct insert (or a future writer) must not be able
  // to turn this route into an SSRF probe against an arbitrary URL.
  const storedUrl = discordWebhookUrlSchema.safeParse(data.webhook_url);
  if (!storedUrl.success) return NextResponse.json({ ok: true, bridged: false });

  let senderName = 'Misfits Cavern';
  const { data: profile } = await supabaseAdmin.from('profiles').select('username').eq('id', user.id).maybeSingle();
  if (profile?.username) senderName = profile.username;

  try {
    const discordRes = await fetch(storedUrl.data, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: (senderName || 'Misfits Cavern').slice(0, 80),
        content: content.slice(0, 2000),
      }),
    });

    if (!discordRes.ok) console.error('Discord webhook post failed:', discordRes.status);
    return NextResponse.json({ ok: true, bridged: discordRes.ok });
  } catch (err) {
    console.error('Discord webhook post error:', err);
    return NextResponse.json({ ok: true, bridged: false });
  }
}
