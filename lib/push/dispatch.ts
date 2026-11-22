// Sending one notification to its person's devices (server only). Called by
// /api/push/dispatch, which the database posts to after a notification is
// written (internal.push_notification). The send itself is passed in — the
// route uses web-push; tests use a stand-in.
import type { SupabaseClient } from '@supabase/supabase-js';
import { readPrefs, typeEnabled } from '@/lib/notifications/prefs';
import { holdPush } from '@/lib/notifications/quiet';

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

export interface DispatchResult { sent: number; removed: number; failed: number; skipped?: 'not-found' | 'switched-off' | 'quiet-hours' | 'no-devices' }

/** The message a device shows: title, a short body, a link inside the app. */
export function toPayload(n: { id: string; type: string; title: string; body: string | null; link: string | null }): PushPayload {
  const link = n.link && n.link.startsWith('/') && !n.link.startsWith('//') ? n.link : '/community';
  return { id: n.id, title: n.title.slice(0, 120), body: (n.body ?? '').slice(0, 300), link, tag: n.type };
}

/** A push service saying the subscription is gone for good. */
const gone = (status: number) => status === 404 || status === 410;

/** Note what happened to the push on the notification itself (what the person's phone did, not what they did): when it went out, or why it did not.
 *  Best effort: a failure to write it must not undo a push that went out. Only this server writes these columns (the database ignores a client's). */
async function note(db: SupabaseClient, id: string, patch: { pushed_at: string } | { push_skipped: string }) {
  await db.from('notifications').update(patch).eq('id', id);
}
async function skip(db: SupabaseClient, id: string, why: NonNullable<DispatchResult['skipped']>): Promise<DispatchResult> {
  await note(db, id, { push_skipped: why });
  return { sent: 0, removed: 0, failed: 0, skipped: why };
}

export async function dispatchNotification(db: SupabaseClient, notificationId: string, send: PushSend, now: Date = new Date()): Promise<DispatchResult> {
  const { data: n, error } = await db.from('notifications').select('id, user_id, type, title, body, link').eq('id', notificationId).maybeSingle();
  if (error) throw error;
  if (!n) return { sent: 0, removed: 0, failed: 0, skipped: 'not-found' };

  const { data: profile, error: pErr } = await db.from('profiles').select('notification_prefs').eq('id', n.user_id).maybeSingle();
  if (pErr) throw pErr;
  const prefs = readPrefs(profile?.notification_prefs);
  if (!typeEnabled(n.type, prefs)) return await skip(db, n.id, 'switched-off');
  // Quiet hours: a normal notification waits in the bell (a call sheet never does).
  if (holdPush(n.type, prefs, now)) return await skip(db, n.id, 'quiet-hours');

  const { data: subs, error: sErr } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', n.user_id);
  if (sErr) throw sErr;
  if (!subs?.length) return await skip(db, n.id, 'no-devices');

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
  await note(db, n.id, result.sent > 0 ? { pushed_at: new Date().toISOString() } : { push_skipped: 'failed' });
  return result;
}
