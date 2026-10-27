'use client';

// /hub/help — Help: the person's support cases and a form to open one. Only
// they and admins read a case (RLS); an admin's answer arrives as a
// notification (and a push) that links back here.

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProtectedPage, useCurrentUser } from '@/lib/os';
import { useLoad } from '@/lib/hooks/useLoad';
import { listMyCases, openCase, STATUS_LABEL } from '@/lib/hub/support';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const field: React.CSSProperties = { background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', fontSize: 14, width: '100%' };
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)' };

export default function HelpPage() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const { toast } = useToast();
  const userId = user?.id ?? null;
  const cases = useLoad(userId ? `support-cases:${userId}` : null, () => listMyCases(userId!));
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  // The page they came from (?from=/studio), so an admin sees where it happened.
  const [page] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const from = new URLSearchParams(window.location.search).get('from');
    return from && from.startsWith('/') ? from : null;
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const res = await openCase({ subject, body, page });
    setBusy(false);
    if ('error' in res) { toast(`Could not open the case: ${res.error}`, 'error'); return; }
    toast('Sent — we’ll answer here and notify you', 'success');
    router.push(`/hub/help/${res.id}`);
  };

  const state = cases.error ? 'error' : cases.loading && !cases.data ? 'loading' : 'ready';

  return (
    <ProtectedPage require="signed-in">
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '24px 16px 96px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
        <Link href="/hub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 13 }}><ArrowLeft size={14} aria-hidden /> Hub</Link>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '2rem', margin: '12px 0 4px' }}>Help</h1>
        <p style={{ color: 'var(--fg-muted)', margin: '0 0 20px', maxWidth: '60ch' }}>Ask the Misfits Cavern team anything — a bug, a question, a missing feature. Only you and our admins can read your cases.</p>

        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} aria-label="Open a case" style={{ display: 'grid', gap: 12, marginBottom: 32, padding: 16, borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.12)' }}>
          <label style={label}>Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required style={field} />
          </label>
          <label style={label}>What happened, or what do you need?
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={6} required style={field} />
          </label>
          {page && <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-muted)' }}>Sent with the page you were on: <code>{page}</code></p>}
          <div><Button type="submit" disabled={busy || !subject.trim() || !body.trim()}>{busy ? 'Sending…' : 'Send'}</Button></div>
        </form>

        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Your cases</h2>
        {state === 'loading' && <p style={{ color: 'var(--fg-muted)' }}>Loading…</p>}
        {state === 'error' && <p role="alert" style={{ color: 'var(--danger)' }}>Could not load your cases. <button type="button" onClick={cases.reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button></p>}
        {state === 'ready' && (cases.data ?? []).length === 0 && <p style={{ color: 'var(--fg-muted)' }}>No cases yet.</p>}
        {state === 'ready' && (cases.data ?? []).length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {(cases.data ?? []).map((c) => (
              <li key={c.id}>
                <Link href={`/hub/help/${c.id}`} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.1)', textDecoration: 'none', color: 'inherit' }}>
                  <span style={{ flex: 1, color: 'var(--fg-strong)' }}>{c.subject}</span>
                  <span style={{ fontSize: 12, color: c.status === 'waiting' ? 'var(--accent)' : 'var(--fg-muted)', fontWeight: c.status === 'waiting' ? 600 : 400 }}>{STATUS_LABEL[c.status]}</span>
                  <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{new Date(c.updated_at).toLocaleDateString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </ProtectedPage>
  );
}
