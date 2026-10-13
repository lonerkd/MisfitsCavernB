// Moderation reports (public.reports): anyone signed in reports a message, a job
// or a profile; an admin reads the queue and settles each one. A report only
// records what someone said — it hides nothing by itself.

import { supabase } from './client';

export type ReportKind = 'message' | 'job' | 'profile';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';
export const REASON_MAX = 500;

export interface ReportRow {
  id: string;
  kind: ReportKind;
  target_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  reporter: { username: string } | null;
}

/** Report something. Returns what to tell the person, or null on success; a repeat report is thanked, not refused. */
export async function reportItem(kind: ReportKind, targetId: string, reason: string): Promise<{ error: string | null; again: boolean }> {
  const text = reason.trim();
  if (!text) return { error: 'Say what is wrong, in a line.', again: false };
  if (text.length > REASON_MAX) return { error: `Keep it under ${REASON_MAX} characters.`, again: false };
  const { error } = await supabase.from('reports').insert({ kind, target_id: targetId, reason: text });
  if (!error) return { error: null, again: false };
  if (error.code === '23505') return { error: null, again: true }; // already reported by this person
  return { error: 'Could not send the report. Try again.', again: false };
}

/** The queue, newest first (an admin sees every report; anyone else only their own). Throws on failure. */
export async function listReports(status: ReportStatus | 'all' = 'open'): Promise<ReportRow[]> {
  let q = supabase
    .from('reports')
    .select('id, kind, target_id, reason, status, created_at, resolved_at, reporter:profiles!reports_reporter_id_fkey(username)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ReportRow[];
}

/** Settle a report (admin). Returns an error message, or null. */
export async function settleReport(id: string, status: 'resolved' | 'dismissed', adminId: string): Promise<string | null> {
  const { error } = await supabase.from('reports').update({ status, resolved_by: adminId, resolved_at: new Date().toISOString() }).eq('id', id);
  return error ? error.message : null;
}

/** Where an admin can look at the thing reported; messages have no page of their own. */
export function targetHref(kind: ReportKind, targetId: string): string | null {
  if (kind === 'job') return `/jobs/${targetId}`;
  if (kind === 'profile') return `/crew/${targetId}`;
  return null;
}

/** Close a reported job (admin only; the database checks). Returns an error message, or null. */
export async function closeReportedJob(jobId: string): Promise<string | null> {
  const { error } = await supabase.rpc('admin_close_job', { p_job: jobId });
  return error ? error.message : null;
}
