'use client';

// /hub/help/<id> — one support case: its conversation and a reply box. Only the
// opener and admins can read it (RLS); anyone else sees "not here".

import React, { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProtectedPage, useCurrentUser } from '@/lib/os';
import { useLoad } from '@/lib/hooks/useLoad';
import { getCase, STATUS_LABEL } from '@/lib/hub/support';
import { SupportThread } from '@/components/hub/SupportThread';

export default function HelpCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useCurrentUser();
  const loaded = useLoad(user ? `support-case:${id}` : null, () => getCase(id));
  const kase = loaded.data ?? null;

  return (
    <ProtectedPage require="signed-in">
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '24px 16px 96px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
        <Link href="/hub/help" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 13 }}><ArrowLeft size={14} aria-hidden /> Help</Link>
        {loaded.loading && !loaded.data && <p style={{ color: 'var(--fg-muted)' }}>Loading…</p>}
        {loaded.error != null && (
          <p role="alert" style={{ color: 'var(--danger)' }}>
            Could not load this case. <button type="button" onClick={loaded.reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button>
          </p>
        )}
        {!loaded.loading && !loaded.error && !kase && <p style={{ color: 'var(--fg-muted)', marginTop: 24 }}>This case isn’t here.</p>}
        {kase && (
          <>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', margin: '12px 0 4px' }}>{kase.subject}</h1>
            <p style={{ color: 'var(--fg-muted)', margin: '0 0 20px', fontSize: 13 }}>
              {STATUS_LABEL[kase.status]} · opened {new Date(kase.created_at).toLocaleDateString()}{kase.page ? <> · from <code>{kase.page}</code></> : null}
            </p>
            <SupportThread kase={kase} viewer="person" onChange={loaded.reload} />
          </>
        )}
      </main>
    </ProtectedPage>
  );
}
