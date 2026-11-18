'use client';

import React, { useMemo, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useSettingsList } from './useSettingsList';
import { cx } from '../ui';
import s from '../studio.module.css';

export interface ClaimEntry { id: string; incident: string; date: string; policy: string; amount: string; status: 'filed' | 'in review' | 'paid' | 'denied'; notes: string }

const INCIDENT_LIMIT = 140;

/**
 * Incidents the crew wrote in a wrap report that have no insurance claim yet (no claim on the same date). Adding files a claim
 * with the incident text and the wrap's date; the claim's status starts as "filed", and nothing in the wrap changes.
 */
export function ClaimsFromWraps({ items, save }: { items: ClaimEntry[]; save: (next: ClaimEntry[]) => Promise<boolean> }) {
  const wraps = useSettingsList('wraps', { find: false });
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(() => {
    const claimedDates = new Set(items.map((c) => c.date));
    return wraps.items.filter((w) => w.incidents.trim() && !claimedDates.has(w.date));
  }, [wraps.items, items]);

  const add = async (list: typeof suggestions) => {
    if (busy || list.length === 0) return;
    setBusy(true);
    try {
      const next = list.map((w): ClaimEntry => ({
        id: `cl-${crypto.randomUUID()}`,
        incident: w.incidents.trim().slice(0, INCIDENT_LIMIT),
        date: w.date,
        policy: '',
        amount: '',
        status: 'filed',
        notes: `From the wrap report for day ${w.dayNumber}`,
      }));
      if (await save([...items, ...next])) toast(next.length === 1 ? 'Claim added' : `${next.length} claims added`, 'success');
    } finally { setBusy(false); }
  };

  if (suggestions.length === 0) return null;
  return (
    <details className={s.panel} style={{ padding: 12 }} open={items.length === 0 || undefined}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minHeight: 32 }}>
        <ClipboardList size={14} aria-hidden />
        <strong>From the wrap reports</strong>
        <span className={s.hint}>{suggestions.length} incident{suggestions.length === 1 ? '' : 's'} not claimed yet</span>
      </summary>
      <div className={s.row} style={{ margin: '8px 0' }}>
        <button type="button" className={s.btnPrimary} disabled={busy} onClick={() => void add(suggestions)}><Plus size={12} /> Add all {suggestions.length}</button>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {suggestions.map((w) => (
          <li key={w.id} className={cx(s.row)} style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{w.incidents.trim().slice(0, INCIDENT_LIMIT)} <span className={s.hint}>· {w.date}</span></div>
              <div className={s.hint} style={{ fontSize: 12 }}>From the wrap report for day {w.dayNumber}</div>
            </div>
            <button type="button" className={cx(s.btn, s.small)} disabled={busy} onClick={() => void add([w])}><Plus size={11} /> Add</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
