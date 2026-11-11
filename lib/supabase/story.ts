import { supabase } from '@/lib/supabase/client';
import type { InterviewAnswers } from '@/lib/story/interview';

export async function getInterview(projectId: string): Promise<{ structureId: string; answers: Partial<InterviewAnswers> } | null> {
  const { data, error } = await (supabase as any).from('story_interviews').select('structure_id, answers').eq('project_id', projectId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { structureId: data.structure_id ?? 'none', answers: data.answers ?? {} };
}

export async function saveInterview(projectId: string, structureId: string, answers: Partial<InterviewAnswers>) {
  const { error } = await (supabase as any).from('story_interviews').upsert({ project_id: projectId, structure_id: structureId, answers, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
