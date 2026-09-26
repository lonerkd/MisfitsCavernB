import { supabase } from './client';
import { awaitOSUser } from '@/lib/os';
import type { Json } from './database.types';

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

/**
 * Record an action in the activity feed. Entries about a project must carry
 * its id (metadata.project_id): only then can its members see them, and
 * nobody else can. A 'project' target is scoped automatically; pass
 * `{ project_id }` for anything else inside a project (scenes, beats…).
 * Unscoped entries are visible to their author only.
 */
export async function logActivity(action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
  const user = await awaitOSUser();
  if (!user) return null;

  const scoped = targetType === 'project' && !metadata.project_id ? { ...metadata, project_id: targetId } : metadata;
  const { data, error } = await supabase
    .from('activity_feed')
    .insert({
      user_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata: scoped as Json,
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging activity:', error);
    return null;
  }
  return data;
}

/** Recent activity in one project. */
export async function getProjectActivities(projectId: string, limit = 10) {
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*, profiles(username, avatar_url)')
    .eq('metadata->>project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
  return data as Activity[];
}
