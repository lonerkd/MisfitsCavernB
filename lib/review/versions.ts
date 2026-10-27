// Versions and the guest review link (supabase/migrations/20261030000000_versions_and_reviews.sql).
// A version is a numbered snapshot of a project script the database takes; it
// is sent for review through a link a client opens without an account. RLS
// decides who proposes (anyone on the project), sends and confirms (people who
// shape it) and reads the link tokens (the same people).

import { supabase } from '@/lib/supabase/client';

export type VersionRow = {
  id: string;
  project_id: string;
  script_id: string;
  number: number;
  label: string;
  status: 'draft' | 'sent';
  sent_at: string | null;
  guest_decision: 'approved' | 'changes_requested' | null;
  guest_decided_at: string | null;
  guest_name: string | null;
  confirmed_at: string | null;
  created_at: string;
};
export type ReviewLinkRow = {
  id: string; project_id: string; token: string; label: string; version_ids: string[];
  expires_at: string | null; revoked_at: string | null; created_at: string;
};
export type ReviewCommentRow = { id: string; version_id: string; author_id: string | null; guest_name: string | null; body: string; created_at: string };

const VERSION_COLUMNS = 'id, project_id, script_id, number, label, status, sent_at, guest_decision, guest_decided_at, guest_name, confirmed_at, created_at';

export type VersionState = 'draft' | 'with-client' | 'approved' | 'changes-requested' | 'confirmed';

/** Where a version stands, in the words the team uses. */
export function versionState(v: Pick<VersionRow, 'status' | 'guest_decision' | 'confirmed_at'>): VersionState {
  if (v.status === 'draft') return 'draft';
  if (v.confirmed_at) return 'confirmed';
  if (v.guest_decision === 'approved') return 'approved';
  if (v.guest_decision === 'changes_requested') return 'changes-requested';
  return 'with-client';
}
export const STATE_LABEL: Record<VersionState, string> = {
  draft: 'Draft', 'with-client': 'With the client', approved: 'Client approved', 'changes-requested': 'Changes requested', confirmed: 'Confirmed by the team',
};

/** The address a client opens. */
export const reviewUrl = (origin: string, token: string) => `${origin.replace(/\/$/, '')}/review/${token}`;

/** A link a client can still use. */
/**
 * Why a phase that needs the client's approval cannot be left yet, or null when
 * it can. Mirrors internal.approval_pending: at least one version has been sent,
 * and for every script that has been sent, its latest sent version is approved
 * by the client and confirmed by the team.
 */
export function approvalBlocker(versions: Array<Pick<VersionRow, 'script_id' | 'number' | 'status' | 'guest_decision' | 'confirmed_at'>>): string | null {
  const latest = new Map<string, (typeof versions)[number]>();
  for (const v of versions) {
    if (v.status !== 'sent') continue;
    const have = latest.get(v.script_id);
    if (!have || v.number > have.number) latest.set(v.script_id, v);
  }
  if (latest.size === 0) return 'Nothing has been sent to the client yet. Send a version for review first.';
  const waiting = [...latest.values()].filter((v) => v.guest_decision !== 'approved' || !v.confirmed_at);
  if (waiting.length === 0) return null;
  const unapproved = waiting.filter((v) => v.guest_decision !== 'approved').length;
  if (unapproved > 0) return `The client has not approved ${unapproved === 1 ? 'a piece' : `${unapproved} pieces`} yet.`;
  return `${waiting.length === 1 ? 'An approval is' : `${waiting.length} approvals are`} waiting for the team to confirm it in Share › Review.`;
}

export function linkLive(l: Pick<ReviewLinkRow, 'revoked_at' | 'expires_at'>, now = Date.now()): boolean {
  return l.revoked_at === null && (l.expires_at === null || Date.parse(l.expires_at) > now);
}

export async function listVersions(projectId: string): Promise<VersionRow[]> {
  const { data, error } = await supabase.from('item_versions').select(VERSION_COLUMNS).eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as VersionRow[];
}
export async function listLinks(projectId: string): Promise<ReviewLinkRow[]> {
  const { data, error } = await supabase.from('review_links').select('id, project_id, token, label, version_ids, expires_at, revoked_at, created_at').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ReviewLinkRow[];
}
export async function listComments(versionIds: string[]): Promise<ReviewCommentRow[]> {
  if (!versionIds.length) return [];
  const { data, error } = await supabase.from('review_comments').select('id, version_id, author_id, guest_name, body, created_at').in('version_id', versionIds).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as ReviewCommentRow[];
}

/** Save the script as it is now as the next version. Returns an error message, or null. */
export async function saveVersion(projectId: string, scriptId: string, label: string): Promise<string | null> {
  const { error } = await supabase.from('item_versions').insert({ project_id: projectId, script_id: scriptId, label: label.trim().slice(0, 120) });
  return error ? error.message : null;
}
/** Send a draft (it can't be changed afterwards). Returns an error message, or null. */
export async function sendVersion(id: string): Promise<string | null> {
  const { error } = await supabase.from('item_versions').update({ status: 'sent' }).eq('id', id);
  return error ? error.message : null;
}
export async function deleteDraft(id: string): Promise<string | null> {
  const { error } = await supabase.from('item_versions').delete().eq('id', id);
  return error ? error.message : null;
}
/** The team's confirmation of what the client decided. Returns an error message, or null. */
export async function confirmVersion(id: string): Promise<string | null> {
  const { error } = await supabase.from('item_versions').update({ confirmed_at: new Date().toISOString() }).eq('id', id);
  return error ? error.message : null;
}
export async function addTeamComment(versionId: string, body: string): Promise<string | null> {
  const text = body.trim();
  if (!text) return 'Write the comment first.';
  if (text.length > 2000) return 'Keep a comment under 2,000 characters.';
  const { error } = await supabase.from('review_comments').insert({ version_id: versionId, body: text });
  return error ? error.message : null;
}

/** A link a client can open, for these sent versions. Returns the link, or an error message. */
export async function createLink(projectId: string, versionIds: string[], label: string): Promise<{ link: ReviewLinkRow } | { error: string }> {
  const { data, error } = await supabase.from('review_links')
    .insert({ project_id: projectId, version_ids: versionIds, label: label.trim().slice(0, 120) })
    .select('id, project_id, token, label, version_ids, expires_at, revoked_at, created_at').single();
  if (error) return { error: error.message };
  return { link: data as ReviewLinkRow };
}
/** Revoke: the link stops working at once. Returns an error message, or null. */
export async function revokeLink(id: string): Promise<string | null> {
  const { error } = await supabase.from('review_links').update({ revoked_at: new Date().toISOString() }).eq('id', id);
  return error ? error.message : null;
}

// ── The guest's side (no account): the RPCs are the only door ────────────────

export type GuestComment = { name: string; from_team: boolean; body: string; at: string };
export type GuestVersion = {
  id: string; number: number; label: string; script_title: string; snapshot: string; sent_at: string | null;
  decision: 'approved' | 'changes_requested' | null; decided_at: string | null; decided_by: string | null; comments: GuestComment[];
};
export type GuestReview = { layer: 'guest' | 'investor'; label: string; versions: GuestVersion[] };

export async function guestComment(token: string, versionId: string, name: string, body: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('add_review_comment', { p_token: token, p_version: versionId, p_name: name, p_body: body });
  return !error && data === true;
}
export async function guestDecide(token: string, versionId: string, decision: 'approved' | 'changes_requested', name: string, note: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('decide_review', { p_token: token, p_version: versionId, p_decision: decision, p_name: name, p_note: note });
  return !error && data === true;
}
