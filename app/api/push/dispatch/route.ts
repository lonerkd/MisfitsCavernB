import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { dispatchNotification } from '@/lib/push/dispatch';
import { parseJsonBody, pushDispatchBodySchema } from '@/lib/validation';
import { LEGAL } from '@/lib/legal';

// The database posts here after a notification is written, when push is
// configured (internal.push_config: this URL + a shared secret). Only that
// secret gets in. Sends the notification to the person's devices — unless
// they switched its kind off — and forgets devices the push service dropped.
//
// Environment: PUSH_DISPATCH_SECRET (same as internal.push_config.secret),
// NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (`npx web-push
// generate-vapid-keys`), SUPABASE_SERVICE_ROLE_KEY. Optional VAPID_SUBJECT.
export const runtime = 'nodejs';

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function POST(req: NextRequest) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !publicKey || !privateKey || !url || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'Push is not configured' }, { status: 503 });
  }

  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ') || !sameSecret(auth.slice(7), secret)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await parseJsonBody(req, pushDispatchBodySchema);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${LEGAL.contactEmail}`, publicKey, privateKey);
  const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const result = await dispatchNotification(db, parsed.data.notification_id, (t, payload) =>
      webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload, { TTL: 3600, urgency: 'high' }));
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('Push dispatch failed:', e);
    return NextResponse.json({ ok: false, error: 'Dispatch failed' }, { status: 500 });
  }
}
