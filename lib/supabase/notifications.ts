import { supabase } from './client';

export interface DBNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read: boolean;
  created_at: string;
}

export async function getNotifications(userId: string, limit = 30) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as DBNotification[];
}

export async function getUnreadCount(userId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
  return count || 0;
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body?: string | null,
  link?: string | null
) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, title, body: body || null, link: link || null })
    .select()
    .single();
  if (error) throw error;
  return data as DBNotification;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  if (error) throw error;
}

export function subscribeToNotifications(userId: string, onInsert: (n: DBNotification) => void) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => onInsert(payload.new as DBNotification)
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
