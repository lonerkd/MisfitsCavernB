import { supabase } from '@/lib/supabase/client';

export interface ChangeReview { change_key: string; kind: 'accept' | 'reject' }

export async function listChangeReviews(projectId: string, scriptId: string): Promise<ChangeReview[]> {
  const { data, error } = await supabase
    .from('change_reviews').select('change_key, kind')
    .eq('project_id', projectId).eq('script_id', scriptId);
  if (error) throw new Error(error.message);
  return (data ?? []) as ChangeReview[];
}

export async function setChangeReview(projectId: string, scriptId: string, changeKey: string, kind: 'accept' | 'reject', userId: string) {
  const { error } = await supabase
    .from('change_reviews').upsert(
      { project_id: projectId, script_id: scriptId, change_key: changeKey, kind, created_by: userId },
      { onConflict: 'project_id,script_id,change_key' },
    );
  if (error) throw new Error(error.message);
}

export async function clearChangeReview(projectId: string, scriptId: string, changeKey: string) {
  const { error } = await supabase
    .from('change_reviews').delete()
    .eq('project_id', projectId).eq('script_id', scriptId).eq('change_key', changeKey);
  if (error) throw new Error(error.message);
}
