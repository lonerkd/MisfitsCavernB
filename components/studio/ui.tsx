'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import s from './studio.module.css';

export const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

export function SectionHeader({ id, eyebrow, title, subtitle, actions }: { id?: string; eyebrow: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className={s.header}>
      <div>
        <div className={s.eyebrow}>{eyebrow}</div>
        <h2 id={id} className={s.title}>{title}</h2>
        {subtitle && <p className={s.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </div>
  );
}

export function StatusPill({ tone, children, title }: { tone: 'ok' | 'busy' | 'error' | 'idle'; children: React.ReactNode; title?: string }) {
  const toneClass = tone === 'ok' ? s.statusOk : tone === 'busy' ? s.statusBusy : tone === 'error' ? s.statusError : undefined;
  return (
    <span className={cx(s.status, toneClass)} title={title} role="status">
      {tone === 'busy' ? <span className={s.spinner} aria-hidden /> : <span className={s.dot} aria-hidden />}
      {children}
    </span>
  );
}

export function Toggle({ on, onChange, label, disabled, title }: { on: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      className={cx(s.toggle, on && s.toggleOn)}
      onClick={() => onChange(!on)}
    />
  );
}

export function ErrorBar({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={s.error} role="alert">
      <span>{message}</span>
      {onRetry && <button type="button" className={cx(s.btn, s.small)} onClick={onRetry}>Retry</button>}
    </div>
  );
}

/**
 * Accessible modal: labelled dialog, Escape and backdrop close, focus moves in
 * on open and returns to the opener on close, Tab stays inside.
 */
export function Modal({ title, onClose, children, actions, narrow }: { title: string; onClose: () => void; children: React.ReactNode; actions?: React.ReactNode; narrow?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((n) => !n.hasAttribute('disabled'));
    (el?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  const titleId = `modal-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return createPortal(
    <div className={s.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cx(s.page, s.modal, narrow && s.modalNarrow)}>
        <div className={s.modalHead}>
          <div id={titleId} className={s.modalTitle}>{title}</div>
          <div className={s.actions}>
            {actions}
            <button type="button" className={s.iconBtn} onClick={onClose} aria-label="Close"><X size={16} /></button>
          </div>
        </div>
        <div className={s.modalBody}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
