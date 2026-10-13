'use client';

// /admin/reports — what people have reported (messages, jobs, profiles), newest
// first. A report hides nothing by itself: an admin looks, acts with the tools
// they have (remove a job, speak to the person), then marks it resolved or
// dismissed. Anyone signed in can file one; only an admin reads them all (RLS).

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProtectedPage, useCurrentUser } from '@/lib/os';
import { useLoad } from '@/lib/hooks/useLoad';
import { listReports, settleReport, targetHref, type ReportStatus } from '@/lib/supabase/reports';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const TABS: { id: ReportStatus; label: string }[] = [{ id: 'open', label: 'Open' }, { id: 'resolved', label: 'Resolved' }, { id: 'dismissed', label: 'Dismissed' }];

export default function AdminReportsPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [tab, setTab] = useState<ReportStatus>('open');
  const reports = useLoad(`reports:${tab}`, () => listReports(tab));
  const rows = reports.data ?? [];

  const settle = async (id: string, status: 'resolved' | 'dismissed') => {
    if (!user) return;
    const error = await settleReport(id, status, user.id);
    if (error) { toast(`Could not update it: ${error}`, 'error'); return; }
    toast(status === 'resolved' ? 'Marked resolved' : 'Dismissed', 'success');
    reports.reload();
  };

  return (
    <ProtectedPage require="admin">
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '24px 24px 96px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
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
            {rows.map((r) => {
              const href = targetHref(r.kind, r.target_id);
              return (
                <li key={r.id} style={{ border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', fontSize: 13, color: 'var(--fg-muted)' }}>
                    <strong style={{ color: 'var(--fg)', textTransform: 'capitalize' }}>{r.kind}</strong>
                    <span>reported by {r.reporter?.username ?? 'someone'}</span>
                    <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleString()}</time>
                    {href ? <Link href={href} style={{ color: 'var(--accent)' }}>Look at it</Link> : <span>Find it in the Lounge</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 15, overflowWrap: 'anywhere' }}>{r.reason}</p>
                  {r.status === 'open' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button onClick={() => void settle(r.id, 'resolved')}>Resolved</Button>
                      <Button variant="ghost" onClick={() => void settle(r.id, 'dismissed')}>Dismiss</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </ProtectedPage>
  );
}
