// Admin writes to the brief catalogue (public.brief_questions). RLS: everyone
// reads, only an admin writes. Deleting a question also deletes every
// project's answer to it (project_brief.question ON DELETE CASCADE), so the
// page counts the answers first and asks before it goes.

import { supabase } from './client';
import type { QuestionRow } from '@/lib/brief/check';
import type { Json } from './database.types';

/** Add a question at the end of the list. Returns an error message, or null. */
export async function addQuestion(q: QuestionRow, position: number): Promise<string | null> {
  const { error } = await supabase.from('brief_questions').insert({ ...q, options: q.options as unknown as NonNullable<Json>, position });
  return error ? error.message : null;
}

/** How many projects have answered a question. Null if it could not be counted. */
export async function countAnswers(key: string): Promise<number | null> {
  const { count, error } = await supabase.from('project_brief').select('*', { count: 'exact', head: true }).eq('question', key);
  return error ? null : count ?? 0;
}

/** Remove a question and, with it, every project's answer. Returns an error message, or null. */
export async function removeQuestion(key: string): Promise<string | null> {
  const { error } = await supabase.from('brief_questions').delete().eq('key', key);
  return error ? error.message : null;
}
