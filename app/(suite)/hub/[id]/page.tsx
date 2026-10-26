'use client';

// /hub/<id> — one hub post. Opening it marks it read (the "new" badge).

import React, { use, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProtectedPage, useCurrentUser } from '@/lib/os';
import { useLoad } from '@/lib/hooks/useLoad';
import { getPost, markRead, isPublished, AUDIENCE_LABEL, KIND_LABEL } from '@/lib/hub/posts';
import { HubMarkdown } from '@/components/hub/HubMarkdown';
import { emitHubRead } from '@/components/hub/useHubUnread';
import { IncidentDetail } from '@/components/hub/IncidentDetail';

export default function HubPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useCurrentUser();
  const loaded = useLoad(user ? `hub-post:${id}` : null, () => getPost(id));
  const post = loaded.data ?? null;

  useEffect(() => {
    if (!post || !isPublished(post)) return;
    void markRead(post.id).then((error) => {
      if (error) console.error('Could not mark the post read:', error);
      else emitHubRead();
    });
  }, [post]);

  return (
    <ProtectedPage require="signed-in">
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '24px 16px 96px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
        <Link href="/hub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 13 }}><ArrowLeft size={14} aria-hidden /> Hub</Link>
        {loaded.loading && !loaded.data && <p style={{ color: 'var(--fg-muted)' }}>Loading…</p>}
        {loaded.error != null && (
          <p role="alert" style={{ color: 'var(--danger)' }}>
            Could not load this post. <button type="button" onClick={loaded.reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button>
          </p>
        )}
        {!loaded.loading && !loaded.error && !post && <p style={{ color: 'var(--fg-muted)', marginTop: 24 }}>This post isn’t here — it may have been taken down.</p>}
        {post && (
          <article style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              {KIND_LABEL[post.kind]}{post.audience !== 'everyone' ? ` · ${AUDIENCE_LABEL[post.audience]}` : ''}
              {' · '}{post.published_at ? new Date(post.published_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Draft'}
            </div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '2rem', margin: '6px 0 16px', color: 'var(--fg-strong)' }}>{post.title}</h1>
            {post.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element -- admin-supplied https image, any host
              <img src={post.cover_url} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 14, marginBottom: 20 }} />
            )}
            <HubMarkdown source={post.body} />
            {post.kind === 'incident' && <IncidentDetail post={post} onChange={loaded.reload} />}
          </article>
        )}
      </main>
    </ProtectedPage>
  );
}
