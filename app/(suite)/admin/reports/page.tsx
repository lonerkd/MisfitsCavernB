'use client';

// /admin/reports — what people have reported (messages, jobs, profiles), newest
// first. A report hides nothing by itself: an admin looks, then hides the thing,
// suspends its author (each with a reason, confirmed, audit-logged by the
// database), or dismisses the report; a settled report says what was done and
// can still be undone (bring it back, reinstate). Anyone signed in can file one;
// only an admin reads them all (RLS).

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProtectedPage } from '@/lib/os';
import { useLoad } from '@/lib/hooks/useLoad';
import { closeReportedJob, getReportTarget, listReports, moderateReport, readReportedMessage, reinstateUser, restoreContent, settleReport, targetHref, type ReportRow, type ReportStatus } from '@/lib/supabase/reports';
import { cleanReason, outcomeLabel, REASON_MAX } from '@/lib/moderation/moderation';
import { useCurrentUser } from '@/lib/os';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

const TABS: { id: ReportStatus; label: string }[] = [{ id: 'open', label: 'Open' }, { id: 'resolved', label: 'Resolved' }, { id: 'dismissed', label: 'Dismissed' }];
const MUTED = { margin: 0, color: 'var(--fg-muted)', fontSize: 13 } as const;

/** What was said, for an admin (even in a channel they are not in, because someone reported it). */
function ReportedMessage({ reportId, hidden }: { reportId: string; hidden: boolean }) {
  const msg = useLoad(`message:${reportId}:${hidden}`, () => readReportedMessage(reportId));
  if (msg.error) return <p role="alert" style={MUTED}>The message is gone, or you cannot read it.</p>;
  if (!msg.data) return msg.loading ? <p style={MUTED}>Loading the message…</p> : null;
  return (
    <blockquote style={{ margin: 0, padding: '8px 12px', borderLeft: '3px solid rgba(var(--ink-rgb), 0.25)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{msg.data.content}</span>
    </blockquote>
  );
}

/** One report: what it is, the state of the thing and its author, and what an admin can do about it. */
function ReportCard({ report: r, adminId, onChanged }: { report: ReportRow; adminId: string | undefined; onChanged: () => void }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const target = useLoad(`target:${r.id}`, () => getReportTarget(r.id));
  const t = target.data;
  const href = targetHref(r.kind, r.target_id);
  const open = r.status === 'open';
  const thing = r.kind === 'profile' ? 'public page' : r.kind;

  const run = async (work: () => Promise<string | null>, done: string, failed: string) => {
    setBusy(true);
    const error = await work();
    setBusy(false);
    if (error) { toast(`${failed}: ${error}`, 'error'); return; }
    toast(done, 'success');
    target.reload();
    onChanged();
  };

  const hide = async () => {
    const why = cleanReason(reason);
    if (!why) { toast(`Say why in a line (up to ${REASON_MAX} characters) first.`, 'error'); return; }
    const message = r.kind === 'message' ? 'Everyone will read "[Removed by an admin]" instead. You keep the words and can bring it back.'
      : r.kind === 'job' ? 'It leaves the board and its poster reads that moderators removed it, with your reason. You can bring it back.'
      : 'Their public portfolio page comes down and they cannot turn it back on until you restore it.';
    if (!(await confirm({ title: `Hide this ${thing}?`, message: `${message} Recorded in the audit log, and the person who reported it is told it was resolved.`, confirmLabel: 'Hide it' }))) return;
    await run(() => moderateReport(r.id, 'hide', why), 'Hidden, and the report is resolved', 'Could not hide it');
  };
  const suspend = async () => {
    const why = cleanReason(reason);
    if (!why) { toast(`Say why in a line (up to ${REASON_MAX} characters) first.`, 'error'); return; }
    if (!(await confirm({ title: `Suspend ${t?.author_name ?? 'this person'}?`, message: 'They cannot sign in, and cannot post, apply, create or report even on a session they already hold. Nothing is deleted, you can reinstate them here or from Users, and it is recorded in the audit log.', confirmLabel: 'Suspend' }))) return;
    await run(() => moderateReport(r.id, 'suspend', why), 'Suspended, and the report is resolved', 'Could not suspend them');
  };
  const dismiss = async () => {
    if (!(await confirm({ title: 'Dismiss this report?', message: 'No action is taken. The person who reported it is told it was dismissed.', confirmLabel: 'Dismiss', danger: false }))) return;
    await run(() => moderateReport(r.id, 'dismiss', reason.trim()), 'Dismissed', 'Could not dismiss it');
  };
  const markResolved = async () => {
    if (!adminId) return;
    await run(() => settleReport(r.id, 'resolved', adminId), 'Marked resolved', 'Could not update it');
  };
  const closeJob = async () => {
    if (!(await confirm({ title: 'Close this job?', message: 'It stops taking applications but stays visible to people who applied. Nothing is deleted, and it is recorded in the audit log. To take it off the board for everyone, hide it instead.', confirmLabel: 'Close job' }))) return;
    await run(async () => (await closeReportedJob(r.target_id)) ?? (adminId ? await settleReport(r.id, 'resolved', adminId) : null), 'Job closed. Marked resolved', 'Could not close it');
  };
  const restore = async () => {
    if (!(await confirm({ title: `Bring this ${thing} back?`, message: r.kind === 'profile' ? 'The page stays off until its owner turns it on again.' : 'Everyone can see it again. Recorded in the audit log.', confirmLabel: 'Bring it back', danger: false }))) return;
    await run(() => restoreContent(r.kind, r.target_id), 'Brought back', 'Could not bring it back');
  };
  const reinstate = async () => {
    if (!t) return;
    if (!(await confirm({ title: `Reinstate ${t.author_name}?`, message: 'They can sign in and write again. Recorded in the audit log.', confirmLabel: 'Reinstate', danger: false }))) return;
    await run(() => reinstateUser(t.author_id), 'Reinstated', 'Could not reinstate them');
  };

  return (
    <li style={{ border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', fontSize: 13, color: 'var(--fg-muted)' }}>
        <strong style={{ color: 'var(--fg)', textTransform: 'capitalize' }}>{r.kind}</strong>
        <span>reported by {r.reporter?.username ?? 'someone'}</span>
        <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleString()}</time>
        {href ? <Link href={href} style={{ color: 'var(--accent)' }}>Look at it</Link> : null}
        {!open && <strong style={{ color: 'var(--fg)' }}>{outcomeLabel(r.outcome, r.status)}</strong>}
      </div>
      <p style={{ margin: 0, fontSize: 15, overflowWrap: 'anywhere' }}>{r.reason}</p>
      {r.kind === 'message' && <ReportedMessage reportId={r.id} hidden={t?.hidden ?? false} />}
      {t && (
        <p style={MUTED}>
          By {t.author_name}{t.suspended ? ` (suspended${t.suspended_reason ? `: ${t.suspended_reason}` : ''})` : ''}. {t.hidden ? `The ${thing} is hidden.` : `The ${thing} is visible.`}
        </p>
      )}
      {target.error ? <p role="alert" style={MUTED}>Could not read its state; it may be gone.</p> : null}
      {open && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
          Reason (needed to hide or suspend; kept in the audit log, and a hidden job shows it to its poster)
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={REASON_MAX} disabled={busy}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.2)', background: 'transparent', color: 'var(--fg)', fontSize: 14 }} />
        </label>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {open && !t?.hidden && <Button variant="danger" disabled={busy} onClick={() => void hide()}>{r.kind === 'profile' ? 'Take the page down' : `Hide the ${r.kind}`}</Button>}
        {open && !t?.suspended && <Button variant="danger" disabled={busy || !t} onClick={() => void suspend()}>Suspend the author</Button>}
        {open && r.kind === 'job' && <Button variant="ghost" disabled={busy} onClick={() => void closeJob()}>Close the job</Button>}
        {open && <Button variant="ghost" disabled={busy} onClick={() => void markResolved()}>Mark resolved</Button>}
        {open && <Button variant="ghost" disabled={busy} onClick={() => void dismiss()}>Dismiss</Button>}
        {t?.hidden && <Button variant="ghost" disabled={busy} onClick={() => void restore()}>Bring it back</Button>}
        {t?.suspended && <Button variant="ghost" disabled={busy} onClick={() => void reinstate()}>Reinstate {t.author_name}</Button>}
      </div>
    </li>
  );
}

export default function AdminReportsPage() {
  const { user } = useCurrentUser();
  const [tab, setTab] = useState<ReportStatus>('open');
  const reports = useLoad(`reports:${tab}`, () => listReports(tab));
  const rows = reports.data ?? [];

  return (
    <ProtectedPage require="admin">
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '24px 24px 96px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
        <Link href="/admin" aria-label="Back to admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 13 }}><ArrowLeft size={14} aria-hidden /> Admin</Link>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', margin: '12px 0 4px' }}>Reports</h1>
        <p style={{ color: 'var(--fg-muted)', margin: '0 0 20px', maxWidth: '60ch' }}>What people have flagged. Look, act, then close it here.</p>

        <div role="tablist" aria-label="Report status" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)}
              style={{ padding: '6px 14px', borderRadius: 9999, cursor: 'pointer', fontSize: 13, border: '1px solid rgba(var(--ink-rgb), 0.14)', background: tab === t.id ? 'rgba(var(--ink-rgb), 0.14)' : 'transparent', color: 'var(--fg)' }}>{t.label}</button>
          ))}
        </div>

        {reports.error ? (
          <p role="alert" style={{ color: 'var(--danger)' }}>Could not load the reports. <button type="button" onClick={reports.reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button></p>
        ) : reports.loading && !reports.data ? (
          <p style={{ color: 'var(--fg-muted)' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)' }}>{tab === 'open' ? 'Nothing waiting. When someone flags a message, a job or a profile it shows here.' : `Nothing ${tab} yet.`}</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rows.map((r) => <ReportCard key={r.id} report={r} adminId={user?.id} onChanged={reports.reload} />)}
          </ul>
        )}
      </div>
    </ProtectedPage>
  );
}
