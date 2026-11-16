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

/** Remove a question and, with it, every project's answer; the database writes an audit-log entry. Returns an error message, or null. */
export async function removeQuestion(key: string): Promise<string | null> {
  const { error } = await supabase.rpc('admin_remove_brief_question', { p_key: key });
  return error ? error.message : null;
}

/** Save the words, the options (with their implies / detect) and ask_when of a question. Returns an error message, or null. */
export async function updateQuestion(key: string, patch: { label?: string; hint?: string; options?: unknown[]; ask_when?: Record<string, unknown> }): Promise<string | null> {
  const { error, data } = await supabase.from('brief_questions').update(patch as never).eq('key', key).select('key');
  if (error) return error.message;
  return data && data.length ? null : 'Nothing was saved (only an admin can edit a question).';
}

/** Move a question one place up (-1) or down (1) within its phase. Returns an error message, or null. */
export async function moveQuestion(key: string, direction: -1 | 1): Promise<string | null> {
  const { error } = await supabase.rpc('admin_move_brief_question', { p_key: key, p_direction: direction });
  return error ? error.message : null;
}

/** The names an option's `implies` may use: roles, channel presets and project formats. Null if they could not be read. */
export async function loadRuleVocab(): Promise<{ crafts: string[]; channels: string[]; formats: string[] } | null> {
  const [c, p, f] = await Promise.all([
    supabase.from('crafts').select('name'),
    supabase.from('channel_presets').select('key'),
    supabase.from('project_formats').select('name'),
  ]);
  if (c.error || p.error || f.error) return null;
  return { crafts: (c.data ?? []).map((r) => r.name), channels: (p.data ?? []).map((r) => r.key), formats: (f.data ?? []).map((r) => r.name) };
}
