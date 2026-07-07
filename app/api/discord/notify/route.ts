import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  let body: { channelId?: string; senderId?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { channelId, senderId, content } = body;
  if (!channelId || !content) return NextResponse.json({ ok: false }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('discord_integrations')
    .select('webhook_url')
    .eq('channel_id', channelId)
    .maybeSingle();

  // No webhook configured for this channel is the overwhelmingly common
  // case (most channels won't have one) — not an error, just a no-op.
  if (error || !data?.webhook_url) return NextResponse.json({ ok: true, bridged: false });

  let senderName = 'Misfits Cavern';
  if (senderId) {
    const { data: profile } = await supabaseAdmin.from('profiles').select('username').eq('id', senderId).maybeSingle();
    if (profile?.username) senderName = profile.username;
  }

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
