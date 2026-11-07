'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * A sheet that rises from the bottom of the screen: the phone's replacement for a side panel or a menu. It keeps clear of the
 * home indicator (safe area) and of the keyboard, scrolls inside itself, closes on its backdrop, its close button and Escape,
 * and hands focus back to whatever opened it. In landscape it takes at most 92% of a short screen.
 */
export function BottomSheet({ open, onClose, title, children, keyboard = 0, full = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; keyboard?: number; full?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const from = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); from?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div onClick={onClose} aria-hidden style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--bg) 65%, transparent)' }} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} style={{
        position: 'absolute', left: 0, right: 0, bottom: keyboard, maxHeight: full ? '96%' : '92%', minHeight: full ? '70%' : undefined, display: 'flex', flexDirection: 'column',
        background: 'var(--surface)', color: 'var(--fg)', borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: '0 -20px 60px color-mix(in srgb, var(--bg) 70%, transparent)', outline: 'none',
        paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 8px 4px 20px', flexShrink: 0 }}>
          <h2 style={{ margin: 0, flex: 1, fontSize: 16, fontWeight: 600 }}>{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '4px 16px 16px', flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}
