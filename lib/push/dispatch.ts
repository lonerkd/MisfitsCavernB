// Sending one notification to its person's devices (server only). Called by
// /api/push/dispatch, which the database posts to after a notification is
// written (internal.push_notification). The send itself is passed in — the
// route uses web-push; tests use a stand-in.
import type { SupabaseClient } from '@supabase/supabase-js';
import { readPrefs, typeEnabled } from '@/lib/notifications/prefs';

export interface PushTarget { endpoint: string; p256dh: string; auth: string }
export type PushSend = (target: PushTarget, payload: string) => Promise<{ statusCode: number }>;

export interface PushPayload {
  id: string;
  title: string;
  body: string;
  /** Site-relative; the service worker opens it on a tap. */
  link: string;
  /** Same tag replaces an earlier notification of the kind on the device. */
  tag: string;
}

export interface DispatchResult { sent: number; removed: number; failed: number; skipped?: 'not-found' | 'switched-off' | 'no-devices' }

/** The message a device shows: title, a short body, a link inside the app. */
export function toPayload(n: { id: string; type: string; title: string; body: string | null; link: string | null }): PushPayload {
  const link = n.link && n.link.startsWith('/') && !n.link.startsWith('//') ? n.link : '/today';
  return { id: n.id, title: n.title.slice(0, 120), body: (n.body ?? '').slice(0, 300), link, tag: n.type };
}

/** A push service saying the subscription is gone for good. */
const gone = (status: number) => status === 404 || status === 410;

export async function dispatchNotification(db: SupabaseClient, notificationId: string, send: PushSend): Promise<DispatchResult> {
  const { data: n, error } = await db.from('notifications').select('id, user_id, type, title, body, link').eq('id', notificationId).maybeSingle();
  if (error) throw error;
  if (!n) return { sent: 0, removed: 0, failed: 0, skipped: 'not-found' };

  const { data: profile, error: pErr } = await db.from('profiles').select('notification_prefs').eq('id', n.user_id).maybeSingle();
  if (pErr) throw pErr;
  if (!typeEnabled(n.type, readPrefs(profile?.notification_prefs))) return { sent: 0, removed: 0, failed: 0, skipped: 'switched-off' };

  const { data: subs, error: sErr } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', n.user_id);
  if (sErr) throw sErr;
  if (!subs?.length) return { sent: 0, removed: 0, failed: 0, skipped: 'no-devices' };

  const payload = JSON.stringify(toPayload(n));
  const result: DispatchResult = { sent: 0, removed: 0, failed: 0 };
  await Promise.all(subs.map(async (s) => {
    try {
      const res = await send({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload);
      if (gone(res.statusCode)) throw Object.assign(new Error('gone'), { statusCode: res.statusCode });
      result.sent++;
      await db.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', s.id);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 0;
      if (gone(status)) {
        await db.from('push_subscriptions').delete().eq('id', s.id);
        result.removed++;
      } else {
        result.failed++;
      }
    }
  }));
  return result;
}
