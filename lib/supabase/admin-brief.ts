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

/**
 * How many projects have answered a question, or (with an option) chose that option.
 * An admin cannot read other projects' answers, so the database counts them (admin_count_brief_answers).
 * Null if it could not be counted.
 */
export async function countAnswers(key: string, option?: string): Promise<number | null> {
  // The function reads a null option as "the whole question"; the generated type has no null.
  const { data, error } = await supabase.rpc('admin_count_brief_answers', { p_key: key, p_option: (option ?? null) as unknown as string });
  return error || typeof data !== 'number' ? null : data;
}

/** Remove one option, clearing the answers that chose it, in one transaction; audit-logged. Returns the error message (or null) and how many answers were cleared. */
export async function removeOption(key: string, option: string): Promise<{ error: string | null; cleared: number }> {
  const { data, error } = await supabase.rpc('admin_remove_brief_option', { p_key: key, p_option: option });
  return error ? { error: error.message, cleared: 0 } : { error: null, cleared: typeof data === 'number' ? data : 0 };
}

/** Remove a question and, with it, every project's answer; the database writes an audit-log entry. Returns an error message, or null. */
export async function removeQuestion(key: string): Promise<string | null> {
  const { error } = await supabase.rpc('admin_remove_brief_question', { p_key: key });
  return error ? error.message : null;
}

/** Save the words, phase, options (labels, new ones, implies / detect) and ask_when of a question. The database refuses a change of kind, or an option dropped, while answers exist. Returns an error message, or null. */
export async function updateQuestion(key: string, patch: { label?: string; hint?: string; phase?: string; position?: number; options?: unknown[]; ask_when?: Record<string, unknown> }): Promise<string | null> {
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
