'use client';

// Crew discovery (a section of Community): people who are open to work, with a
// way into the full directory. Reads the same directory as /crew.

import React from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { useLoad } from '@/lib/hooks/useLoad';
import { listDirectory } from '@/lib/supabase/profiles';

const SHOWN = 8;

export function CrewStrip() {
  const loaded = useLoad('community:crew-open', () => listDirectory({ search: '', role: 'All', availability: 'OPEN', limit: SHOWN }));
  const people = (loaded.data ?? []).slice(0, SHOWN);

  if (loaded.error) {
    return (
      <p role="alert" style={{ color: 'var(--danger)', margin: 0 }}>
        Could not load the crew. <button type="button" onClick={loaded.reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button>
      </p>
    );
  }
  if (loaded.loading && !loaded.data) return <p style={{ color: 'var(--fg-muted)', margin: 0 }}>Loading…</p>;

  return (
    <div>
      {people.length === 0 ? (
        <p style={{ color: 'var(--fg-muted)', margin: '0 0 12px' }}>Nobody has marked themselves open to work yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/crew/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.12)', background: 'var(--glass)', color: 'inherit', textDecoration: 'none' }}>
                <Avatar src={p.avatar_url} name={p.username} size={36} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 600, color: 'var(--fg-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.role || 'Open to work'}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/crew" style={{ color: 'var(--accent)', fontSize: 14 }}>Browse the whole crew →</Link>
    </div>
  );
}
