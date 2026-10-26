// The hub's Help: support cases (support_cases) and their conversation
// (support_case_messages). RLS decides who reads — the opener and admins — and
// the database moves a case's status and notifies the other side on each
// message (supabase/migrations/20261027000000_hub_support.sql).

import { supabase } from '@/lib/supabase/client';

export const CASE_STATUSES = ['open', 'waiting', 'resolved'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

/** Labels from the person's side; the admin queue uses ADMIN_STATUS_LABEL. */
export const STATUS_LABEL: Record<CaseStatus, string> = { open: 'With us', waiting: 'Answered', resolved: 'Resolved' };
export const ADMIN_STATUS_LABEL: Record<CaseStatus, string> = { open: 'Needs an answer', waiting: 'Waiting on them', resolved: 'Resolved' };

export interface SupportCase {
  id: string;
  opened_by: string;
  subject: string;
  page: string | null;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
}

export interface CaseMessage {
  id: string;
  case_id: string;
  author_id: string | null;
  from_admin: boolean;
  body: string;
  created_at: string;
}

const CASE_COLUMNS = 'id, opened_by, subject, page, status, created_at, updated_at';

export type CheckedCase = { ok: true; value: { subject: string; body: string; page: string | null } } | { ok: false; error: string };

export function checkCase(input: { subject: string; body: string; page?: string | null }): CheckedCase {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject) return { ok: false, error: 'Give it a subject.' };
  if (subject.length > 200) return { ok: false, error: 'Keep the subject under 200 characters.' };
  const bodyError = checkMessage(body);
  if (bodyError) return { ok: false, error: bodyError };
  const page = input.page?.trim() ? input.page.trim().slice(0, 500) : null;
  return { ok: true, value: { subject, body, page } };
}

export function checkMessage(body: string): string | null {
  const text = body.trim();
  if (!text) return 'Write a message first.';
  if (text.length > 5000) return 'Keep a message under 5,000 characters.';
  return null;
}

/** Cases needing an answer first, then waiting, then resolved; newest activity first in each. */
export function sortCases(cases: SupportCase[]): SupportCase[] {
  const rank: Record<CaseStatus, number> = { open: 0, waiting: 1, resolved: 2 };
  return [...cases].sort((a, b) => rank[a.status] - rank[b.status] || Date.parse(b.updated_at) - Date.parse(a.updated_at));
}

/** The caller's cases, or every case for an admin (RLS decides). */
export async function listCases(): Promise<SupportCase[]> {
  const { data, error } = await supabase.from('support_cases').select(CASE_COLUMNS).order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return sortCases((data ?? []) as SupportCase[]);
}

/** Only the caller's own cases, even for an admin. */
export async function listMyCases(userId: string): Promise<SupportCase[]> {
  const { data, error } = await supabase.from('support_cases').select(CASE_COLUMNS).eq('opened_by', userId).order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return sortCases((data ?? []) as SupportCase[]);
}

export async function getCase(id: string): Promise<SupportCase | null> {
  const { data, error } = await supabase.from('support_cases').select(CASE_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SupportCase | null) ?? null;
}

export async function listMessages(caseId: string): Promise<CaseMessage[]> {
  const { data, error } = await supabase
    .from('support_case_messages')
    .select('id, case_id, author_id, from_admin, body, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CaseMessage[];
}

/** Open a case with its first message. Returns the case id, or an error message. */
export async function openCase(input: { subject: string; body: string; page?: string | null }): Promise<{ id: string } | { error: string }> {
  const checked = checkCase(input);
  if (!checked.ok) return { error: checked.error };
  const { subject, body, page } = checked.value;
  const { data, error } = await supabase.from('support_cases').insert({ subject, page }).select('id').single();
  if (error || !data) return { error: error?.message ?? 'Could not open the case.' };
  const sent = await sendMessage(data.id, body);
  if (sent) return { error: sent };
  return { id: data.id };
}

/** Add a message to a case. Returns an error message, or null. */
export async function sendMessage(caseId: string, body: string): Promise<string | null> {
  const problem = checkMessage(body);
  if (problem) return problem;
  const { error } = await supabase.from('support_case_messages').insert({ case_id: caseId, body: body.trim() });
  return error ? error.message : null;
}

/** Admin: set a case's status. Returns an error message, or null. */
export async function setCaseStatus(caseId: string, status: CaseStatus): Promise<string | null> {
  const { error } = await supabase.from('support_cases').update({ status }).eq('id', caseId);
  return error ? error.message : null;
}
