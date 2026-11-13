'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Columns2, X } from 'lucide-react';
import { projectPairSearch, useInPane } from '@/lib/split/pane';
import { readOffer, shouldOffer, writeOffer } from '@/lib/split/offer';
import { useHydrated } from '@/lib/hooks/useSearchParam';

/** Once per project, on a wide screen: the project beside the tool its phase works in. Remembers the answer on this device. */
export function TwoPanesOffer({ projectId, phase }: { projectId: string; phase: string }) {
  const inPane = useInPane();
  const hydrated = useHydrated();
  const [answered, setAnswered] = useState(false);
  if (!hydrated || answered || !shouldOffer(window.innerWidth, inPane, readOffer(projectId))) return null;
  const answer = (a: 'accepted' | 'declined') => { writeOffer(projectId, a); setAnswered(true); };
  return (
    <div role="region" aria-label="Work in two panes" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 14px', marginBottom: 16, borderRadius: 14, border: '1px solid color-mix(in srgb, var(--accent) 38%, transparent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', fontSize: 13 }}>
      <Columns2 size={16} aria-hidden />
      <span style={{ flex: 1, minWidth: 200 }}>This screen has room for two panes: the project on one side, the tool you are working in on the other.</span>
      <Link href={`/split${projectPairSearch(projectId, phase)}`} onClick={() => writeOffer(projectId, 'accepted')}
        style={{ padding: '6px 12px', borderRadius: 9999, background: 'var(--accent)', color: 'var(--bg)', textDecoration: 'none', fontSize: 12 }}>Open two panes</Link>
      <button type="button" onClick={() => answer('declined')} aria-label="Not now" style={{ background: 'transparent', border: 0, color: 'var(--fg-muted)', cursor: 'pointer', display: 'inline-flex' }}><X size={14} aria-hidden /></button>
    </div>
  );
}
