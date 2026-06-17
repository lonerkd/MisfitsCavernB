import { supabase } from './client';

// The event backbone: every meaningful mutation across the suite writes one
// row here. ProjectContext subscribes to inserts and ripples them straight
// into whichever module has the related project open — this is what lets
// "added a reference" in Studio show up as a live event in another tab.
export async function logActivity(
  userId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, any>
) {
  const { error } = await supabase.from('activity_feed').insert({
    user_id: userId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata ?? null,
  });
  if (error) console.error('Error logging activity:', error);
}

export async function getProjectActivity(projectId: string, limit = 30) {
  const { data, error } = await supabase
    .from('activity_feed')
    .select('*')
    .contains('metadata', { project_id: projectId })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Error fetching activity:', error);
    return [];
  }
  return data;
}
