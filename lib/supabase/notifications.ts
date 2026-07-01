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

// Per-device notification preferences (mirrors the Settings toggles). A muted
// type is never surfaced client-side.
const PREF_KEY: Record<string, string> = {
  reply: 'mc_notify_replies',
  comment: 'mc_notify_replies',
  job: 'mc_notify_jobs',
  application: 'mc_notify_jobs',
  product: 'mc_notify_product',
};
export function typeEnabled(type: string): boolean {
  const key = PREF_KEY[type];
  if (!key) return true;
  try { return localStorage.getItem(key) !== 'off'; } catch { return true; }
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
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return ((data as Notification[]) || []).filter(nf => typeEnabled(nf.type));
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
