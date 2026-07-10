import { supabase } from './client';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

// Account-level preferences stored on profiles.notification_prefs so they sync
// across devices (was previously localStorage-only). Includes notification
// toggles plus security prefs like leaked-password protection. A muted type
// is never surfaced client-side. Defaults: replies/jobs on, product off.
export interface NotificationPrefs { replies: boolean; jobs: boolean; product: boolean; leak_check: boolean }
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { replies: true, jobs: true, product: false, leak_check: true };

const TYPE_PREF: Record<string, keyof NotificationPrefs> = {
  reply: 'replies', comment: 'replies', job: 'jobs', application: 'jobs', product: 'product',
};

export function typeEnabled(type: string, prefs: NotificationPrefs = DEFAULT_NOTIFICATION_PREFS): boolean {
  const key = TYPE_PREF[type];
  if (!key) return true;
  return prefs[key] !== false;
}

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const { data } = await supabase.from('profiles').select('notification_prefs').eq('id', userId).single();
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(data?.notification_prefs || {}) };
}

export async function saveNotificationPrefs(userId: string, patch: Partial<NotificationPrefs>) {
  const current = await getNotificationPrefs(userId);
  const next = { ...current, ...patch };
  await supabase.from('profiles').update({ notification_prefs: next }).eq('id', userId);
  return next;
}

// Create a notification for a recipient. No-ops when the recipient is the
// actor themselves (you don't notify yourself) or missing.
export async function notify(userId: string | null | undefined, n: { type: string; title: string; body?: string; link?: string }, actorId?: string | null) {
  if (!userId || (actorId && actorId === userId)) return;
  await supabase.from('notifications').insert({
    user_id: userId,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
    read: false,
  });
}

export async function fetchNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const [{ data }, prefs] = await Promise.all([
    supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit),
    getNotificationPrefs(userId),
  ]);
  return ((data as Notification[]) || []).filter(nf => typeEnabled(nf.type, prefs));
}

export async function markRead(id: string) {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllRead(userId: string) {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export async function deleteNotification(id: string) {
  await supabase.from('notifications').delete().eq('id', id);
}
