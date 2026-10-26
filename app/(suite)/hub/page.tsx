'use client';

// /hub — Misfits Cavern's newsletter: What's new (updates) and Learn (guides),
// for everyone or one audience. Signed-in people read published posts; admins
// also see drafts here and write them at /admin/hub (RLS decides).

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Pin } from 'lucide-react';
import { ProtectedPage, useCurrentUser } from '@/lib/os';
import { useLoad } from '@/lib/hooks/useLoad';
import {
  listPosts, listReadIds, forAudience, isPublished, HUB_AUDIENCES, AUDIENCE_LABEL, KIND_LABEL,
  type HubAudience, type HubKind, type HubPost,
} from '@/lib/hub/posts';
import { plainText } from '@/lib/hub/markdown';
import { isOpen, sortIncidents, SEVERITY_LABEL } from '@/lib/hub/status';
import { useFlag } from '@/components/Flag';

const pill = (on: boolean): React.CSSProperties => ({
  padding: '6px 12px', borderRadius: 9999, fontSize: 13, cursor: 'pointer',
  border: `1px solid ${on ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.14)'}`,
  background: on ? 'rgba(232, 67, 26, 0.12)' : 'transparent', color: on ? 'var(--fg-strong)' : 'var(--fg-muted)',
});

function when(p: HubPost) {
  const at = p.published_at ?? p.updated_at;
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HubPage() {
  const { user, isAdmin } = useCurrentUser();
  const userId = user?.id ?? null;
  const loaded = useLoad(userId ? `hub:${userId}` : null, async () => {
    const [posts, read] = await Promise.all([listPosts(), listReadIds()]);
    return { posts, read };
  });
  const [kind, setKind] = useState<HubKind>('update');
  const [audience, setAudience] = useState<HubAudience>('everyone');
  const statusOn = useFlag('hub_status');
  const kinds: HubKind[] = statusOn ? ['update', 'guide', 'incident'] : ['update', 'guide'];

  const shown = useMemo(() => {
    const posts = loaded.data?.posts ?? [];
    if (kind === 'incident') return sortIncidents(posts);
    return forAudience(posts.filter((p) => p.kind === kind), audience);
  }, [loaded.data, kind, audience]);

  const state = loaded.error ? 'error' : loaded.loading && !loaded.data ? 'loading' : 'ready';

  return (
    <ProtectedPage require="signed-in">
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '24px 16px 96px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '2rem', margin: '8px 0 4px' }}>Hub</h1>
        <p style={{ color: 'var(--fg-muted)', margin: '0 0 20px', maxWidth: '60ch' }}>News from Misfits Cavern: what has changed in The Cavern, and how to get the most from it.{isAdmin && <> <Link href="/admin/hub" style={{ color: 'var(--accent)' }}>Write a post</Link></>}</p>

        <div role="tablist" aria-label="Section" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {kinds.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)} style={pill(kind === k)}>{KIND_LABEL[k]}</button>
          ))}
        </div>
        {kind !== 'incident' && <div role="group" aria-label="Audience" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {HUB_AUDIENCES.map((a) => (
            <button key={a} type="button" aria-pressed={audience === a} onClick={() => setAudience(a)} style={pill(audience === a)}>{AUDIENCE_LABEL[a]}</button>
          ))}
        </div>}
        {kind === 'incident' && <div style={{ marginBottom: 24 }} />}

        {state === 'loading' && <p style={{ color: 'var(--fg-muted)' }}>Loading…</p>}
        {state === 'error' && (
          <p role="alert" style={{ color: 'var(--danger)' }}>
            Could not load the hub. <button type="button" onClick={loaded.reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button>
          </p>
        )}
        {state === 'ready' && shown.length === 0 && (
          <p style={{ color: 'var(--fg-muted)' }}>{kind === 'incident' ? 'All systems normal — no incidents.' : <>Nothing here yet{audience !== 'everyone' ? ` for ${AUDIENCE_LABEL[audience].toLowerCase()}` : ''}.</>}</p>
        )}
        {state === 'ready' && shown.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
            {shown.map((p) => {
              const unread = isPublished(p) && !loaded.data!.read.has(p.id);
              return (
                <li key={p.id}>
                  <Link href={`/hub/${p.id}`} style={{ display: 'block', padding: 16, borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.12)', textDecoration: 'none', color: 'inherit', background: 'var(--glass)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--fg-muted)', marginBottom: 6 }}>
                      {p.pinned && <Pin size={12} aria-label="Pinned" />}
                      {p.kind === 'incident' && <span style={{ color: isOpen(p) ? 'var(--danger)' : 'var(--fg-muted)', fontWeight: 600 }}>{SEVERITY_LABEL[p.severity ?? 'minor']} · {isOpen(p) ? 'Ongoing' : p.resolved_at ? 'Resolved' : 'Draft'}</span>}
                      <span>{when(p)}</span>
                      {p.audience !== 'everyone' && <span>· {AUDIENCE_LABEL[p.audience]}</span>}
                      {!isPublished(p) && <span style={{ color: 'var(--warn)' }}>· Draft</span>}
                      {unread && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 600 }}>New</span>}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg-strong)', marginBottom: 4 }}>{p.title}</div>
                    {p.body && <div style={{ fontSize: 14, color: 'var(--fg-muted)' }}>{plainText(p.body, 180)}</div>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </ProtectedPage>
  );
}
