import { NextRequest, NextResponse } from 'next/server';

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

    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'Discord rejected that webhook (it may have been deleted or the URL is wrong).' });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not reach Discord to verify the webhook. Check the URL and try again.' });
  }
}
