import { NextRequest, NextResponse } from 'next/server';

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
const WEBHOOK_URL_PATTERN = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export async function POST(req: NextRequest) {
  let body: { webhookUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const url = (body.webhookUrl || '').trim();
  if (!WEBHOOK_URL_PATTERN.test(url)) {
    return NextResponse.json({ ok: false, error: 'That doesn’t look like a Discord webhook URL. It should look like https://discord.com/api/webhooks/123.../abc...' });
  }

  try {
    // GET on a webhook URL returns the webhook's own metadata (name, channel
    // id) if it's live, or a 401/404 if it's been deleted/revoked — cheaper
    // and less noisy in the target channel than posting a real test message.
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'Discord rejected that webhook (it may have been deleted or the URL is wrong).' });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not reach Discord to verify the webhook. Check the URL and try again.' });
  }
}
