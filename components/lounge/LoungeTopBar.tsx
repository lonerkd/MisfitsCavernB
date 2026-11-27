'use client';

import type { Lounge } from '@/components/lounge/useLounge';
import { usePhoneLayout } from '@/lib/os/usePhone';

/**
 * The Lounge's top strip on a desk: who is online. It used to carry a project picker too, but the island already switches projects
 * (on a mouse and on a finger), and a second picker cost a phone its top 44-62 px and, at 44 px targets, overflowed its own bar.
 * On a phone there is nothing left for it to say (the online count is hidden there), so it is not drawn and the room goes to the chat.
 */
export function LoungeTopBar({ l }: { l: Lounge }) {
  const { crewList, onlineCrew } = l;
  const { phone } = usePhoneLayout();
  if (phone) return null;
  return (
    <nav className="mc-lounge-top" aria-label="Lounge status" style={{
      position: 'sticky',
      top: 0,
      padding: '0 clamp(16px, 4vw, 28px)',
      minHeight: 44,
      gap: 12,
      display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
      zIndex: 100,
      background: 'var(--bg-2)',
      borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)',
      flexShrink: 0,
    }}>
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
    </nav>
  );
}
