'use client';

import React, {  } from 'react';

export function ScriptOSPreview({ lines, caption }: { lines?: string[]; caption: string }) {
  if (lines && lines.length > 0) {
    return (
      <div className="screenplay-preview" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 260, overflow: 'hidden' }}>
        {lines.slice(0, 9).map((l, i) => {
          const t = l.trim();
          if (!t) return <div key={i} style={{ height: 3 }} />;
          const isHead = /^(INT|EXT|EST|I\/E)[.\s]/i.test(t);
          const isChar = !isHead && t === t.toUpperCase() && t.length > 1 && t.length < 32 && !/[.!?,]$/.test(t);

          const display = isHead || isChar ? t : t.length > 80 ? t.slice(0, 80) + '…' : t;
          return (
            <div key={i}
              className={isHead ? 'screenplay-scene-hdr' : isChar ? 'screenplay-char' : ''}
              style={{
                fontSize: 11,
                color: isHead ? undefined : isChar ? undefined : 'var(--fg-dim)',
                lineHeight: 1.45,
                whiteSpace: isHead || isChar ? 'nowrap' : 'normal',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: isHead || isChar ? undefined : 32,
              }}>{display}</div>
          );
        })}
      </div>
    );
  }
  // No script to show (signed out, or nothing written yet): the shape of a
  // screenplay page, not invented words.
  return (
    <div style={{ padding: '22px 16px', display: 'flex', flexDirection: 'column', gap: 7 }} aria-hidden>
      {[['52%', 0, 'var(--accent)'], ['92%', 0], ['78%', 0], [0], ['22%', '38%'], ['52%', '20%'], ['40%', '20%'], [0], ['46%', 0, 'var(--accent)'], ['88%', 0]].map(([w, ml, c], i) => (
        w ? <div key={i} style={{ height: 5, width: w as string, marginLeft: ml as string, borderRadius: 4, background: (c as string) ?? 'rgba(var(--ink-rgb), 0.08)', opacity: c ? 0.45 : 1 }} />
          : <div key={i} style={{ height: 4 }} />
      ))}
      <PreviewCaption>{caption}</PreviewCaption>
    </div>
  );
}

function PreviewCaption({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '10px 0 0', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)' }}>{children}</p>;
}

export function StudioPreview({ items, caption }: { items: { label: string; color: string }[]; caption: string }) {
  if (!items.length) {
    return (
      <div style={{ padding: '16px 14px' }} aria-hidden>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {['#818cf8', '#10b981', '#e8431a', '#f59e0b'].map((c) => (
            <div key={c} style={{ height: 34, borderRadius: 8, border: '1px dashed rgba(var(--ink-rgb), 0.08)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, opacity: 0.5 }} />
              <div style={{ height: 4, flex: 1, borderRadius: 4, background: 'rgba(var(--ink-rgb), 0.06)' }} />
            </div>
          ))}
        </div>
        <PreviewCaption>{caption}</PreviewCaption>
      </div>
    );
  }
  return (
    <div style={{ padding: '16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: 'rgba(var(--ink-rgb), 0.03)',
          border: '1px solid rgba(var(--ink-rgb), 0.06)',
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: item.color,
            flexShrink: 0,
            boxShadow: `0 0 6px ${item.color}`,
          }} />
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 'max(8.5px, var(--mc-min-font, 0px))',
            color: 'var(--fg-dim)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function LoungePreview({ messages, caption }: { messages: { from: string; text: string; mine: boolean }[]; caption: string }) {
  if (!messages.length) {
    return (
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }} aria-hidden>
        {[['58%', false], ['44%', true], ['66%', false]].map(([w, mine], i) => (
          <div key={i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', width: w as string, height: 24, borderRadius: mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px', border: `1px dashed ${mine ? 'rgba(232, 67, 26,0.25)' : 'rgba(var(--ink-rgb), 0.08)'}` }} />
        ))}
        <PreviewCaption>{caption}</PreviewCaption>
      </div>
    );
  }
  return (
    <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {messages.map((m, i) => (
        <div key={i} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: m.mine ? 'flex-end' : 'flex-start',
        }}>
          {!m.mine && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--ok)', letterSpacing: 'var(--caps-track)', marginBottom: 3 }}>{m.from}</span>
          )}
          <div style={{
            background: m.mine ? 'rgba(232, 67, 26,0.15)' : 'rgba(var(--ink-rgb), 0.05)',
            border: `1px solid ${m.mine ? 'rgba(232, 67, 26,0.2)' : 'rgba(var(--ink-rgb), 0.07)'}`,
            borderRadius: m.mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
            padding: '7px 12px',
            maxWidth: '80%',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))', color: 'rgba(var(--fg-rgb), 0.75)' }}>{m.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PortfolioPreview({ works }: { works: Array<{ title: string; year: number | null; category: string | null; accent: string | null }> }) {
  if (works.length) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${works.length}, minmax(0, 1fr))`, gap: 10, padding: 14, minHeight: 140 }}>
        {works.map((w, i) => (
          <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', minHeight: 120, background: `linear-gradient(160deg, #0d0d0f 0%, ${w.accent || '#1a1008'} 160%)`, border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 18, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.title}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', marginTop: 4 }}>{[w.category, w.year].filter(Boolean).join(' · ') || 'New work'}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', minHeight: 140 }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(160deg, #0d0d0f 0%, #1a1008 40%, #0a0806 100%)',
      }} />
      {[0.15, 0.4, 0.65, 0.85].map((y, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: 0, right: 0,
          top: `${y * 100}%`,
          height: 1,
          background: 'rgba(var(--ink-rgb), 0.04)',
        }} />
      ))}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '14%', background: '#000', opacity: 0.6 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '14%', background: '#000', opacity: 0.6 }} />
      <div style={{
        position: 'absolute',
        top: '20%', left: '35%',
        width: '40%', height: '60%',
        background: 'radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '18%', right: 16,
        fontFamily: 'var(--mono)',
        fontSize: 'max(7px, var(--mc-min-font, 0px))',
        letterSpacing: 'var(--caps-track)',
        textTransform: 'var(--caps)',
        color: 'var(--fg-dim)',
      }}>
        Published work shows here
      </div>
    </div>
  );
}
