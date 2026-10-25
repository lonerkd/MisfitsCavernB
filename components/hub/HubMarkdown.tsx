import React from 'react';
import Link from 'next/link';
import { parseMarkdown, type Inline } from '@/lib/hub/markdown';

function Inlines({ v }: { v: Inline[] }) {
  return (
    <>
      {v.map((n, i) => {
        switch (n.t) {
          case 'text': return <React.Fragment key={i}>{n.v}</React.Fragment>;
          case 'strong': return <strong key={i}><Inlines v={n.v} /></strong>;
          case 'em': return <em key={i}><Inlines v={n.v} /></em>;
          case 'code': return <code key={i} style={{ fontFamily: 'var(--mono)', fontSize: '0.9em', background: 'rgba(var(--ink-rgb), 0.08)', padding: '1px 5px', borderRadius: 4 }}>{n.v}</code>;
          case 'link':
            return n.href.startsWith('/')
              ? <Link key={i} href={n.href} style={{ color: 'var(--accent)' }}><Inlines v={n.v} /></Link>
              : <a key={i} href={n.href} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--accent)' }}><Inlines v={n.v} /></a>;
        }
      })}
    </>
  );
}

const HEADING_SIZE = { 1: '1.5rem', 2: '1.25rem', 3: '1.1rem' } as const;

export function HubMarkdown({ source }: { source: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--fg)', maxWidth: '68ch' }}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h': {
            const Tag = (`h${b.level + 1}`) as 'h2' | 'h3' | 'h4';
            return <Tag key={i} style={{ fontFamily: 'var(--display)', fontSize: HEADING_SIZE[b.level], margin: i === 0 ? '0 0 0.4em' : '1.2em 0 0.4em', color: 'var(--fg-strong)' }}><Inlines v={b.v} /></Tag>;
          }
          case 'p': return <p key={i} style={{ margin: '0 0 1em' }}><Inlines v={b.v} /></p>;
          case 'quote': return <blockquote key={i} style={{ margin: '0 0 1em', paddingLeft: 14, borderLeft: '3px solid var(--accent)', color: 'var(--fg-muted)' }}><Inlines v={b.v} /></blockquote>;
          case 'ul':
          case 'ol': {
            const Tag = b.t;
            return <Tag key={i} style={{ margin: '0 0 1em', paddingLeft: 22, listStyle: b.t === 'ul' ? 'disc' : 'decimal' }}>{b.items.map((it, j) => <li key={j}><Inlines v={it} /></li>)}</Tag>;
          }
        }
      })}
    </div>
  );
}
