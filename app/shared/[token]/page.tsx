// Public, read-only project snapshot — the destination of an "anyone with the
// link" share URL. Anon has no row access to `projects`; the token is resolved
// by the get_shared_project() RPC, which returns only overview fields for a
// link/public project (never scenes, budget, chat or scripts).
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import GrainOverlay from '@/components/GrainOverlay';

interface SharedProject {
  title: string;
  description: string | null;
  status: string;
  accent_color: string | null;
  visibility: string;
  creator?: { username?: string } | null;
}

export default function SharedProjectPage() {
  const params = useParams();
  const token = String(params.token || '');
  const [project, setProject] = useState<SharedProject | null | 'missing'>('missing');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc('get_shared_project', { p_token: token });
      if (!active) return;
      setLoading(false);
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) { setProject('missing'); return; }
      setProject({
        title: row.title,
        description: row.description,
        status: row.status,
        accent_color: row.accent_color,
        visibility: row.visibility,
        creator: row.creator_username ? { username: row.creator_username } : null,
      });
    })();
    return () => { active = false; };
  }, [token]);

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border-2)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (project === 'missing') {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40, textAlign: 'center' }}>
        <GrainOverlay />
        <div style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 4 }}>CAVERN</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>This project is not shared (or the link is wrong).</div>
        <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, color: 'var(--accent)', textDecoration: 'none', marginTop: 12 }}>← Back to Misfits Cavern</Link>
      </main>
    );
  }

  if (!project) return null;

  const color = project.accent_color || '#d7340b';

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', position: 'relative' }}>
      <GrainOverlay />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '50vh', pointerEvents: 'none', zIndex: 0, background: `radial-gradient(ellipse at 50% -20%, ${color}0a 0%, transparent 65%)` }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '80px 24px 120px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--fg-dim)', marginBottom: 16 }}>
          Misfits Cavern · {project.visibility === 'public' ? 'Public project' : 'Shared project'}
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', letterSpacing: 3, margin: 0, lineHeight: 1 }}>{project.title}</h1>
        {project.creator?.username && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-muted)', marginTop: 12, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            by {project.creator.username}
          </div>
        )}
        {project.description && (
          <p style={{ fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.7, color: 'var(--fg-muted)', marginTop: 24 }}>{project.description}</p>
        )}
        <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
          <Link href="/auth" style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
            color: 'var(--bg)', background: 'var(--accent)', borderRadius: 9999, padding: '12px 26px',
            textDecoration: 'none',
          }}>Enter the Cavern</Link>
        </div>
      </div>
    </main>
  );
}