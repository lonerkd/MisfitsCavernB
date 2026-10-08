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

export { DEFAULT_NOTIFICATION_PREFS, typeEnabled, type NotificationPrefs } from '@/lib/notifications/prefs';
import { readPrefs, typeEnabled, type NotificationPrefs } from '@/lib/notifications/prefs';

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  // Private column: only readable by its owner, through get_my_account().
  void userId;
  const { data } = await supabase.rpc('get_my_account');
  return readPrefs(data?.[0]?.notification_prefs);
}

export async function saveNotificationPrefs(userId: string, patch: Partial<NotificationPrefs>) {
  const current = await getNotificationPrefs(userId);
  const next = { ...current, ...patch };
  const { error } = await supabase.from('profiles').update({ notification_prefs: next }).eq('id', userId);
  if (error) throw error;
  return next;
}

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
