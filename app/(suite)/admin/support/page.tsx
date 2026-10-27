'use client';

// /admin/support — the support queue: every case (RLS gives admins all of
// them), those needing an answer first. Answering moves a case to "waiting on
// them" and notifies the person; an admin can also set the status by hand.

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProtectedPage } from '@/lib/os';
import { useLoad } from '@/lib/hooks/useLoad';
import { listCases, setCaseStatus, CASE_STATUSES, ADMIN_STATUS_LABEL, type CaseStatus } from '@/lib/hub/support';
import { SupportThread } from '@/components/hub/SupportThread';
import { useToast } from '@/components/ui/Toast';

const pill = (on: boolean): React.CSSProperties => ({
  padding: '6px 12px', borderRadius: 9999, fontSize: 13, cursor: 'pointer',
  border: `1px solid ${on ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.14)'}`,
  background: on ? 'rgba(232, 67, 26, 0.12)' : 'transparent', color: on ? 'var(--fg-strong)' : 'var(--fg-muted)',
});

export default function AdminSupportPage() {
  const { toast } = useToast();
  const loaded = useLoad('admin-support', listCases);
  // A notification links here with ?case=<id>.
  const [linked] = useState(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('case')));
  const [filter, setFilter] = useState<CaseStatus | 'all'>(linked ? 'all' : 'open');
  const [selected, setSelected] = useState<string | null>(linked);

  const cases = useMemo(() => (loaded.data ?? []).filter((c) => filter === 'all' || c.status === filter), [loaded.data, filter]);
  const current = (loaded.data ?? []).find((c) => c.id === selected) ?? null;

  const changeStatus = async (status: CaseStatus) => {
    if (!current) return;
    const error = await setCaseStatus(current.id, status);
    if (error) { toast(`Could not change the status: ${error}`, 'error'); return; }
    toast(`Marked “${ADMIN_STATUS_LABEL[status]}”`, 'success');
    loaded.reload();
  };

  const state = loaded.error ? 'error' : loaded.loading && !loaded.data ? 'loading' : 'ready';

  return (
    <ProtectedPage require="admin">
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '24px 16px 96px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
        <Link href="/admin" aria-label="Back to admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 13 }}><ArrowLeft size={14} aria-hidden /> Admin</Link>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', margin: '12px 0 4px' }}>Support</h1>
        <p style={{ color: 'var(--fg-muted)', margin: '0 0 20px', maxWidth: '60ch' }}>Cases people open from Help. Your answer notifies them (and pushes to their phone).</p>

        <div role="group" aria-label="Status" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {([...CASE_STATUSES, 'all'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)} style={pill(filter === s)}>
              {s === 'all' ? 'All' : ADMIN_STATUS_LABEL[s]}{s !== 'all' && loaded.data ? ` (${loaded.data.filter((c) => c.status === s).length})` : ''}
            </button>
          ))}
        </div>

        {state === 'loading' && <p style={{ color: 'var(--fg-muted)' }}>Loading…</p>}
        {state === 'error' && <p role="alert" style={{ color: 'var(--danger)' }}>Could not load the cases. <button type="button" onClick={loaded.reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button></p>}
        {state === 'ready' && cases.length === 0 && <p style={{ color: 'var(--fg-muted)' }}>Nothing here.</p>}
        {state === 'ready' && cases.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '0 0 24px', padding: 0, display: 'grid', gap: 8 }}>
            {cases.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSelected(c.id)} aria-current={selected === c.id} style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'baseline', textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: `1px solid ${selected === c.id ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.1)'}`, background: 'none', color: 'inherit', cursor: 'pointer' }}>
                  <span style={{ flex: 1, color: 'var(--fg-strong)' }}>{c.subject}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{ADMIN_STATUS_LABEL[c.status]}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{new Date(c.updated_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {current && (
          <section aria-label={`Case: ${current.subject}`} style={{ padding: 16, borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.12)', display: 'grid', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>{current.subject}</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-muted)' }}>
              Opened {new Date(current.created_at).toLocaleString()}{current.page ? <> · from <code>{current.page}</code></> : null} · <Link href={`/crew/${current.opened_by}`} style={{ color: 'var(--accent)' }}>their profile</Link>
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Status
              <select value={current.status} onChange={(e) => void changeStatus(e.target.value as CaseStatus)} style={{ background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '4px 8px', color: 'var(--fg-strong)' }}>
                {CASE_STATUSES.map((s) => <option key={s} value={s}>{ADMIN_STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <SupportThread key={current.id} kase={current} viewer="admin" onChange={loaded.reload} />
          </section>
        )}
      </main>
    </ProtectedPage>
  );
}
