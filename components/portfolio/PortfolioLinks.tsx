'use client';

// Two links under the owner's portfolio header: the public directory, and (once the person has published their page) their own page.
// The page link appears only when the setting is on, so it never points at a not-found.
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyPortfolioPage, getPortfolioOwner } from '@/lib/supabase/portfolio';
import { pagePath, type PagePublish } from '@/lib/portfolio/page-setting';

const linkStyle: React.CSSProperties = { color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 'var(--caps-track)' };

export function PortfolioLinks({ userId }: { userId: string }) {
  const [state, setState] = useState<{ setting: PagePublish; username: string | null } | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.all([getMyPortfolioPage(), getPortfolioOwner(userId).catch(() => null)]).then(([setting, owner]) => {
      if (live) setState({ setting, username: owner?.username ?? null });
    });
    return () => { live = false; };
  }, [userId]);

  return (
    <p style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16 }}>
      {state && state.setting !== 'off' && state.username && <Link href={pagePath(state.username)} style={linkStyle}>Your public page →</Link>}
      {state && state.setting === 'off' && <Link href="/portfolio/manage" style={linkStyle}>Publish your page →</Link>}
      <Link href="/portfolios" style={linkStyle}>Browse portfolios →</Link>
    </p>
  );
}
