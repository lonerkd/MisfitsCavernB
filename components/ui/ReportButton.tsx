'use client';

import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { REASON_MAX, reportItem, type ReportKind } from '@/lib/supabase/reports';

/** A small flag that opens "what is wrong?" and sends the report to the admins. Used on messages, jobs and profiles. */
export function ReportButton({ kind, targetId, label = 'Report', style }: { kind: ReportKind; targetId: string; label?: string; style?: React.CSSProperties }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (busy) return;
    setBusy(true);
    const { error, again } = await reportItem(kind, targetId, reason);
    setBusy(false);
    if (error) { toast(error, 'error'); return; }
    toast(again ? 'You have already reported this — the admins have it.' : 'Thanks — the admins will look at it.', 'success');
    setOpen(false);
    setReason('');
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${label} this ${kind}`} title={label} style={style ?? { display: 'inline-flex', background: 'none', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 8, color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}>
        <Flag size={12} aria-hidden />
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Report this ${kind}`} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.55)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div style={{ width: 'min(420px, 100%)', background: 'var(--surface-solid, var(--bg))', border: '1px solid rgba(var(--ink-rgb), 0.14)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Report this {kind}</h2>
            <label htmlFor="report-reason" style={{ fontSize: 13, color: 'var(--fg-muted)' }}>What is wrong? One line is enough.</label>
            <textarea id="report-reason" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={REASON_MAX} rows={3}
              style={{ background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={send} disabled={busy || !reason.trim()}>{busy ? 'Sending…' : 'Send report'}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
