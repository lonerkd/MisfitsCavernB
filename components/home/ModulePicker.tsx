'use client';

// The home page's four parts of the suite on a phone: one at a time, chosen by a row of tabs, instead of a grid of four large
// previews. Signed out each shows how the part looks; signed in it shows your own latest script, references, channel messages
// (the same data the desktop grid shows). Choosing a part shows it and the way in.

import React, { useState } from 'react';
import Link from 'next/link';
import { ScriptOSPreview, StudioPreview, LoungePreview, PortfolioPreview } from '@/components/landing/Previews';

type Part = 'editor' | 'studio' | 'lounge' | 'portfolio';
const PARTS: { id: Part; name: string; tag: string; href: string }[] = [
  { id: 'editor', name: 'ScriptOS', tag: 'Screenplay editor', href: '/editor' },
  { id: 'studio', name: 'Studio', tag: 'Asset hub', href: '/studio' },
  { id: 'lounge', name: 'Lounge', tag: 'Crew collaboration', href: '/lounge' },
  { id: 'portfolio', name: 'Portfolio', tag: 'Cinematic showcase', href: '/portfolio' },
];

export interface ModuleData {
  scriptLines: string[];
  assets: { label: string; color: string }[];
  messages: { from: string; text: string; mine: boolean }[];
  works: Array<{ title: string; year: number | null; category: string | null; accent: string | null }>;
}

export function ModulePicker({ data, loggedIn }: { data: ModuleData; loggedIn: boolean }) {
  const [part, setPart] = useState<Part>('editor');
  const cur = PARTS.find((p) => p.id === part)!;
  return (
    <div>
      <div role="tablist" aria-label="Parts of the suite" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
        {PARTS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`home-tab-${p.id}`}
            aria-selected={part === p.id}
            aria-controls="home-panel"
            onClick={() => setPart(p.id)}
            style={{
              flex: '0 0 auto', minHeight: 44, padding: '8px 14px', borderRadius: 9999, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 12,
              letterSpacing: 'var(--caps-track)', border: `1px solid ${part === p.id ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.14)'}`,
              background: part === p.id ? 'var(--accent)' : 'transparent', color: part === p.id ? 'var(--on-accent)' : 'var(--fg-muted)',
            }}
          >{p.name}</button>
        ))}
      </div>
      <div role="tabpanel" id="home-panel" aria-labelledby={`home-tab-${part}`} style={{ background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.05)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ maxHeight: 260, overflow: 'hidden' }}>
          {part === 'editor' && <ScriptOSPreview lines={data.scriptLines} caption={loggedIn ? 'Your latest script appears here' : 'Screenplay formatting as you type'} />}
          {part === 'studio' && <StudioPreview items={data.assets} caption={loggedIn ? 'Your references and media appear here' : 'Every reference, clip and track in one library'} />}
          {part === 'lounge' && <LoungePreview messages={data.messages} caption={loggedIn ? 'Your crew channels appear here' : 'Channels and calls with your crew'} />}
          {part === 'portfolio' && <PortfolioPreview works={data.works} />}
        </div>
        <Link href={cur.href} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(var(--ink-rgb), 0.06)', color: 'var(--fg)', textDecoration: 'none', fontSize: 14 }}>
          <span>{cur.name} <span style={{ color: 'var(--fg-dim)' }}>· {cur.tag}</span></span>
          <span aria-hidden>Open →</span>
        </Link>
      </div>
    </div>
  );
}
