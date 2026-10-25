'use client';

import type { Lounge } from '@/components/lounge/useLounge';

export function LoungeTopBar({ l }: { l: Lounge }) {
  const { activeProject, projects, setActiveProject, crewList, onlineCrew } = l;
  return (
    <nav className="mc-lounge-top" style={{
      position: 'sticky',
      top: 0,
      padding: '0 clamp(16px, 4vw, 28px)',
      height: 62,
      gap: 12,
      display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
      zIndex: 100,
      background: 'var(--surface)',
      backdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)',
      boxShadow: '0 1px 0 rgba(16,185,129,0.08) inset',
      flexShrink: 0,
    }}>
      {/* The picker takes what room is left and cuts a long name short — the header never runs off a phone screen. */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(var(--ink-rgb), 0.03)', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(var(--ink-rgb), 0.06)', minWidth: 0, maxWidth: 'min(320px, 100%)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: activeProject?.accent_color || 'var(--accent)', flexShrink: 0 }} />
          <select
            aria-label="Active project"
            value={activeProject?.id || ''}
            onChange={(e) => {
              const p = projects.find(p => p.id === e.target.value);
              if (p) setActiveProject(p);
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--fg-strong)', fontSize: 11, fontWeight: 600, outline: 'none', cursor: 'pointer', minWidth: 0, width: '100%', textOverflow: 'ellipsis' }}
          >
            {projects.map(p => <option key={p.id} value={p.id} style={{ background: 'var(--bg-3)' }}>{p.title}</option>)}
          </select>
        </div>

        <div className="mc-lounge-online" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px',
          background: 'rgba(var(--ink-rgb), 0.03)',
          border: '1px solid rgba(var(--ink-rgb), 0.06)',
          borderRadius: 'var(--radius-full)',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00cc66', boxShadow: '0 0 8px rgba(0,204,102,0.8)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)' }}>
            {onlineCrew} of {crewList.length} online
          </span>
        </div>
      </div>
    </nav>
  );
}
