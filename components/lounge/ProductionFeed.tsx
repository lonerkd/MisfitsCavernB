'use client';

import { useEffect } from 'react';
import { useNow } from '@/lib/hooks/useNow';
import { getProductionFeed, type FeedKind } from '@/lib/supabase/project-hub';
import { useLoad } from '@/lib/hooks/useLoad';

const FEED_COLOR: Record<FeedKind, string> = {
  scene: 'var(--warn)', budget: 'var(--ok)', milestone: 'var(--violet)', crew: '#ec4899', reference: '#a855f7', note: 'var(--danger)',
};

/** What was added to the project lately. A side panel: if it can't load, it stays hidden (and says why in the console). */
export function ProductionFeed({ projectId }: { projectId: string }) {
  const feed = useLoad(projectId, () => getProductionFeed(projectId));
  useEffect(() => { if (feed.error) console.error('Production feed failed to load:', feed.error); }, [feed.error]);
  const items = (feed.data ?? []).map((it) => ({ ...it, color: FEED_COLOR[it.kind] }));

  const now = useNow();
  const ago = (iso: string) => { const d = (now - new Date(iso).getTime()) / 3600000; return d < 1 ? `${Math.max(1, Math.floor(d * 60))}m` : d < 24 ? `${Math.floor(d)}h` : `${Math.floor(d / 24)}d`; };

  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-subtle)', marginBottom: 10 }}>Production Feed</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: it.color, marginTop: 5, flexShrink: 0, boxShadow: `0 0 6px ${it.color}` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-subtle)', flexShrink: 0 }}>{ago(it.t)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
