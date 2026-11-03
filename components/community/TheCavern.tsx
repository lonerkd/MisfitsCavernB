'use client';

// The Cavern (a section of Community): the platform's numbers, and a preview of
// each part of the suite that doubles as a picker — choose one to see what it
// looks like with your own work in it, then open it. All of it is real: the
// stats are the platform's, the previews show what you last did.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPlatformStats } from '@/lib/supabase/stats';
import { latestScriptEditedBy } from '@/lib/supabase/scripts';
import { listRecentMediaTitles } from '@/lib/supabase/media';
import { listRecentChannelMessages } from '@/lib/supabase/messages';
import { supabase } from '@/lib/supabase/client';
import { awaitOSUser } from '@/lib/os';
import { ScriptOSPreview, StudioPreview, LoungePreview, PortfolioPreview } from '@/components/landing/Previews';

type Part = 'editor' | 'studio' | 'lounge' | 'portfolio';
const PARTS: { id: Part; name: string; tag: string; href: string }[] = [
  { id: 'editor', name: 'ScriptOS', tag: 'Screenplay editor', href: '/editor' },
  { id: 'studio', name: 'Studio', tag: 'Asset hub', href: '/studio' },
  { id: 'lounge', name: 'Lounge', tag: 'Crew collaboration', href: '/lounge' },
  { id: 'portfolio', name: 'Portfolio', tag: 'Cinematic showcase', href: '/portfolio' },
];
const PALETTE = ['var(--info)', 'var(--ok)', 'var(--accent)', 'var(--warn)', 'var(--violet)'];

interface Stats { users: number; scripts: number; projects: number; media: number }

export function TheCavern() {
  const [part, setPart] = useState<Part>('editor');
  const [stats, setStats] = useState<Stats | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [assets, setAssets] = useState<{ label: string; color: string }[]>([]);
  const [messages, setMessages] = useState<{ from: string; text: string; mine: boolean }[]>([]);
  const [works, setWorks] = useState<{ title: string; year: number | null; category: string | null; accent: string | null }[]>([]);

  useEffect(() => {
    let live = true;
    getPlatformStats().then((s) => { if (live) setStats(s); }).catch((e) => console.error('Community stats failed:', e));
    Promise.resolve(supabase.rpc('get_recent_work', { p_limit: 3 })).then((r) => {
      if (live) setWorks((r.data ?? []).map((w) => ({ title: w.title, year: w.year, category: w.category, accent: w.accent_color })));
    }).catch((e) => console.error('Community works failed:', e));
    awaitOSUser().then(async (user) => {
      if (!user || !live) return;
      const [script, media, msgs] = await Promise.all([
        latestScriptEditedBy(user.id).catch(() => null),
        listRecentMediaTitles(6).catch(() => []),
        listRecentChannelMessages(4).catch(() => []),
      ]);
      if (!live) return;
      setLines(script?.content ? String(script.content).split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 11) : []);
      setAssets(media.map((a, i) => ({ label: a.title || 'Reference', color: PALETTE[i % PALETTE.length] })));
      setMessages(msgs.slice().reverse().map((m) => ({ from: m.username || 'Crew', text: m.content, mine: m.sender_id === user.id })));
    }).catch((e) => console.error('Community previews failed:', e));
    return () => { live = false; };
  }, []);

  const current = PARTS.find((p) => p.id === part)!;
  const figures = stats ? [
    { n: stats.users, label: 'Creators' }, { n: stats.scripts, label: 'Screenplays' },
    { n: stats.projects, label: 'Productions' }, { n: stats.media, label: 'References & media' },
  ] : [];

  return (
    <div>
      {figures.length > 0 && (
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, margin: '0 0 16px' }}>
          {figures.map((f) => (
            <div key={f.label} style={{ padding: '12px 10px', borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.12)', background: 'var(--glass)', textAlign: 'center' }}>
              <dd style={{ margin: 0, fontFamily: 'var(--display)', fontSize: '1.8rem', color: 'var(--fg-strong)' }}>{f.n.toLocaleString()}</dd>
              <dt style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{f.label}</dt>
            </div>
          ))}
        </dl>
      )}
      <div role="tablist" aria-label="Parts of the Cavern" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {PARTS.map((p) => (
          <button key={p.id} type="button" role="tab" id={`cavern-tab-${p.id}`} aria-selected={part === p.id} aria-controls="cavern-panel" onClick={() => setPart(p.id)}
            style={{ padding: '6px 12px', borderRadius: 9999, fontSize: 13, cursor: 'pointer', border: `1px solid ${part === p.id ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.14)'}`, background: part === p.id ? 'rgba(var(--ink-rgb), 0.06)' : 'transparent', color: part === p.id ? 'var(--fg-strong)' : 'var(--fg-muted)' }}>
            {p.name}
          </button>
        ))}
      </div>
      <div id="cavern-panel" role="tabpanel" aria-labelledby={`cavern-tab-${part}`} style={{ borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.12)', background: 'var(--bg-2)', overflow: 'hidden' }}>
        {part === 'editor' && <ScriptOSPreview lines={lines} caption="Your latest script appears here" />}
        {part === 'studio' && <StudioPreview items={assets} caption="Your references and media appear here" />}
        {part === 'lounge' && <LoungePreview messages={messages} caption="Your crew channels appear here" />}
        {part === 'portfolio' && <PortfolioPreview works={works} />}
      </div>
      <p style={{ margin: '12px 0 0' }}><Link href={current.href} style={{ color: 'var(--accent)', fontSize: 14 }}>Open {current.name} — {current.tag} →</Link></p>
    </div>
  );
}
