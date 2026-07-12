import { supabase } from './client';
import { awaitOSUser } from '@/lib/os';

export interface Activity {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata?: any;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

export async function logActivity(action: string, targetType: string, targetId: string, metadata: any = {}) {
  const user = await awaitOSUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('activity_feed')
    .insert({
      user_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging activity:', error);
    return null;
  }
  return data;
}

export async function getActivities(limit = 10) {
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*, profiles(username, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
  return data as Activity[];
}

export function subscribeToActivities(callback: (payload: any) => void) {
  return supabase
    .channel('activity_feed_changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, callback)
    .subscribe();
}
